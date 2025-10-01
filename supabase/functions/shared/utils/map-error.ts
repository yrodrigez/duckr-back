import { DomainError } from "@errors/domain-error.ts";

export function mapDomainError(error: DomainError): Response {
    return new Response(
        JSON.stringify({ error: true, message: error.message, code: error.code, statusCode: error.statusCode }),
        { status: error.statusCode, headers: { "Content-Type": "application/json" } },
    );
}

export function mapUnknownError(error: unknown): Response {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
        JSON.stringify({ error: true, message, code: 'UNKNOWN_ERROR', statusCode: 500 }),
        { status: 500, headers: { "Content-Type": "application/json" } },
    );
}