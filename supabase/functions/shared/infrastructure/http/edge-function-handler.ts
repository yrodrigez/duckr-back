import { requestContext } from "../logging/request-context.ts";
import { createLogger } from "../logging/logger.ts";
import { ResponseMapper } from "../../utils/map-error.ts";
import { z } from "https://esm.sh/zod@3.23.8";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";

export interface CorsConfig {
    origin: string | string[] | "*";
    credentials?: boolean;
    allowedMethods?: HttpMethod[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    maxAge?: number;
}


export interface EdgeFunctionConfig<TInput> {
    functionName: string;
    inputSchema?: z.ZodSchema<TInput>;
    allowedMethods?: HttpMethod[];
    cors?: CorsConfig;
}

export interface EdgeFunctionContext<TInput> {
    input: TInput;
    logger: ReturnType<typeof createLogger>;
    requestId: string;
    req: Request;
    url: URL;
    searchParams: URLSearchParams;
    getHeader: (name: string) => string | null;
}

/**
 * Helper function to create CORS headers
 */
function createCorsHeaders(config: CorsConfig, requestOrigin?: string | null): Record<string, string> {
    const headers: Record<string, string> = {};

    // Handle origin
    if (config.origin === "*") {
        headers["Access-Control-Allow-Origin"] = "*";
    } else if (Array.isArray(config.origin)) {
        if (requestOrigin && config.origin.includes(requestOrigin)) {
            headers["Access-Control-Allow-Origin"] = requestOrigin;
            headers["Vary"] = "Origin";
        }
    } else if (typeof config.origin === "string") {
        headers["Access-Control-Allow-Origin"] = config.origin;
    }

    // Handle credentials
    if (config.credentials) {
        headers["Access-Control-Allow-Credentials"] = "true";
    }

    // Handle allowed methods
    if (config.allowedMethods && config.allowedMethods.length > 0) {
        headers["Access-Control-Allow-Methods"] = config.allowedMethods.join(", ");
    } else {
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS";
    }

    // Handle allowed headers
    if (config.allowedHeaders && config.allowedHeaders.length > 0) {
        headers["Access-Control-Allow-Headers"] = config.allowedHeaders.join(", ");
    } else {
        headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Request-ID";
    }

    // Handle exposed headers
    if (config.exposedHeaders && config.exposedHeaders.length > 0) {
        headers["Access-Control-Expose-Headers"] = config.exposedHeaders.join(", ");
    }

    // Handle max age
    if (config.maxAge !== undefined) {
        headers["Access-Control-Max-Age"] = config.maxAge.toString();
    }

    return headers;
}

export function createEdgeFunction<TInput = unknown, TOutput = unknown>(
    config: EdgeFunctionConfig<TInput>,
    handler: (ctx: EdgeFunctionContext<TInput>) => Promise<TOutput>
) {
    return Deno.serve((req: Request) => {
        const requestId = crypto.randomUUID();

        return requestContext.run({ requestId }, async () => {
            const logger = createLogger(config.functionName);
            const startTime = Date.now();
            const url = new URL(req.url);
            const requestOrigin = req.headers.get("Origin");

            try {
                // Handle CORS preflight (OPTIONS request)
                if (config.cors && req.method === "OPTIONS") {
                    const corsHeaders = createCorsHeaders(config.cors, requestOrigin);
                    return new Response(null, {
                        status: 204,
                        headers: corsHeaders,
                    });
                }

                logger.info("Request started", {
                    method: req.method,
                    url: url.pathname,
                    origin: requestOrigin
                });

                // Validate HTTP method
                if (config.allowedMethods && config.allowedMethods.length > 0) {
                    if (!config.allowedMethods.includes(req.method as HttpMethod)) {
                        logger.warn("Method not allowed", {
                            method: req.method,
                            allowed: config.allowedMethods
                        });

                        const headers: Record<string, string> = {
                            "Content-Type": "application/json",
                            "Allow": config.allowedMethods.join(", "),
                        };

                        if (config.cors) {
                            Object.assign(headers, createCorsHeaders(config.cors, requestOrigin));
                        }

                        return new Response(
                            JSON.stringify({
                                error: "Method Not Allowed",
                                allowed_methods: config.allowedMethods,
                                request_id: requestId
                            }),
                            { status: 405, headers }
                        );
                    }
                }

                // Parse and validate input
                let input: TInput;

                if (req.method === "GET" || req.method === "DELETE") {
                    // GET/DELETE requests typically don't have bodies
                    input = {} as TInput;
                } else if (config.inputSchema) {
                    // Validate body with schema
                    let body;
                    try {
                        const contentType = req.headers.get("Content-Type");
                        if (contentType?.includes("application/json")) {
                            body = await req.json();
                        } else {
                            body = {};
                        }
                    } catch (jsonError) {
                        logger.error("Failed to parse JSON body", jsonError);

                        const headers: Record<string, string> = {
                            "Content-Type": "application/json",
                        };

                        if (config.cors) {
                            Object.assign(headers, createCorsHeaders(config.cors, requestOrigin));
                        }

                        return new Response(
                            JSON.stringify({
                                error: "Bad Request",
                                message: "Invalid JSON in request body",
                                request_id: requestId
                            }),
                            { status: 400, headers }
                        );
                    }

                    const parsed = config.inputSchema.safeParse(body);

                    if (!parsed.success) {
                        logger.error("Request validation failed", {
                            errors: parsed.error.flatten()
                        });

                        const headers: Record<string, string> = {
                            "Content-Type": "application/json",
                        };

                        if (config.cors) {
                            Object.assign(headers, createCorsHeaders(config.cors, requestOrigin));
                        }

                        return ResponseMapper.error({
                            message: "Bad Request: Invalid request body",
                            statusCode: 400,
                            code: "BAD_REQUEST"
                        }, requestId);
                    }

                    input = parsed.data;
                } else {
                    try {
                        input = await req.json();
                    } catch {
                        input = {} as TInput;
                    }
                }

                const result = await handler({
                    input,
                    logger,
                    requestId,
                    req,
                    url,
                    searchParams: url.searchParams,
                    getHeader: (name: string) => req.headers.get(name),
                });

                const duration = Date.now() - startTime;
                logger.info("Request completed successfully", { durationMs: duration });

                const responseHeaders: Record<string, string> = {
                    "Content-Type": "application/json",
                    "X-Request-ID": requestId,
                };

                if (config.cors) {
                    Object.assign(responseHeaders, createCorsHeaders(config.cors, requestOrigin));
                }

                return new Response(
                    JSON.stringify(result),
                    {
                        status: 200,
                        headers: responseHeaders
                    }
                );

            } catch (error: unknown) {
                const duration = Date.now() - startTime;
                logger.error("Request failed", error, { durationMs: duration });

                const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                    "X-Request-ID": requestId,
                };

                if (config.cors) {
                    Object.assign(headers, createCorsHeaders(config.cors, requestOrigin));
                }

                return ResponseMapper.error(error, requestId);
            }
        });
    });
}