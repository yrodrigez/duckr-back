import * as log from "https://deno.land/std@0.208.0/log/mod.ts";
import environment from "../environment.ts";

export enum LogLevel {
	DEBUG = "DEBUG",
	INFO = "INFO",
	WARN = "WARN",
	ERROR = "ERROR",
	CRITICAL = "CRITICAL",
}

export interface LogContext {
	[key: string]: any;
}

const SENSITIVE_KEYS = [
	"access_token",
	"accessToken",
	"refresh_token",
	"refreshToken",
	"password",
	"secret",
	"key",
	"token",
	"auth",
	"authorization",
	"bearer",
	"api_key",
	"apiKey",
	"client_secret",
	"clientSecret",
	"private_key",
	"privateKey",
	"session",
	"cookie",
	"credentials",
	"jwt",
];

function sanitizeValue(value: any): any {
	if (value === null || value === undefined) {
		return value;
	}

	if (typeof value === "string") {
		return value.length > 0 ? "[REDACTED]" : value;
	}

	if (Array.isArray(value)) {
		return value.map(sanitizeValue);
	}

	if (typeof value === "object") {
		const sanitized: any = {};
		for (const [key, val] of Object.entries(value)) {
			const lowerKey = key.toLowerCase();
			const isSensitive = SENSITIVE_KEYS.some((sensitiveKey) =>
				lowerKey.includes(sensitiveKey.toLowerCase())
			);

			if (isSensitive) {
				sanitized[key] = "[REDACTED]";
			} else {
				sanitized[key] = sanitizeValue(val);
			}
		}
		return sanitized;
	}

	return value;
}

function sanitizeMessage(message: string): string {
	// Redact common token patterns in messages
	return message
		.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, "Bearer [REDACTED]")
		.replace(/token[=:]\s*[A-Za-z0-9\-._~+/]+=*/gi, "token=[REDACTED]")
		.replace(/key[=:]\s*[A-Za-z0-9\-._~+/]+=*/gi, "key=[REDACTED]")
		.replace(/password[=:]\s*\S+/gi, "password=[REDACTED]");
}

class Logger {
	private static instance: Logger;
	private logger: log.Logger;
	private functionName: string;

	private constructor(functionName: string = "unknown") {
		this.functionName = functionName;
		this.setupLogger();
		this.logger = log.getLogger();
	}

	public static getInstance(functionName?: string): Logger {
		if (
			!Logger.instance ||
			(functionName && Logger.instance.functionName !== functionName)
		) {
			Logger.instance = new Logger(functionName);
		}
		return Logger.instance;
	}

	private setupLogger(): void {
		const env = environment();
		const logLevel = env.isProd ? LogLevel.INFO : LogLevel.DEBUG;

		log.setup({
			handlers: {
				console: new log.handlers.ConsoleHandler(logLevel, {
					formatter: (logRecord) => {
						const timestamp = new Date().toISOString();
						const level = logRecord.levelName.padEnd(5);
						const sanitizedMessage = sanitizeMessage(logRecord.msg);
						const context =
							logRecord.args.length > 0 &&
								typeof logRecord.args[0] === "object"
								? ` ${
									JSON.stringify(
										sanitizeValue(logRecord.args[0]),
									)
								}`
								: "";

						return `[${timestamp}] ${level} [${this.functionName}] ${sanitizedMessage}${context}`;
					},
				}),
			},
			loggers: {
				default: {
					level: logLevel,
					handlers: ["console"],
				},
			},
		});
	}

	public debug(message: string, context?: LogContext): void {
		if (context) {
			this.logger.debug(message, context);
		} else {
			this.logger.debug(message);
		}
	}

	public info(message: string, context?: LogContext): void {
		if (context) {
			this.logger.info(message, context);
		} else {
			this.logger.info(message);
		}
	}

	public warn(message: string, context?: LogContext): void {
		if (context) {
			this.logger.warning(message, context);
		} else {
			this.logger.warning(message);
		}
	}

	public error(
		message: string,
		error?: Error | unknown,
		context?: LogContext,
	): void {
		const errorContext = error instanceof Error
			? { error: error.message, stack: error.stack, ...context }
			: { error: String(error), ...context };

		if (errorContext) {
			this.logger.error(message, errorContext);
		} else {
			this.logger.error(message);
		}
	}

	public critical(
		message: string,
		error?: Error | unknown,
		context?: LogContext,
	): void {
		const errorContext = error instanceof Error
			? { error: error.message, stack: error.stack, ...context }
			: { error: String(error), ...context };

		if (errorContext) {
			this.logger.critical(message, errorContext);
		} else {
			this.logger.critical(message);
		}
	}

	public setFunctionName(functionName: string): void {
		this.functionName = functionName;
		this.setupLogger();
	}
}

export function createLogger(functionName: string): Logger {
	return Logger.getInstance(functionName);
}

export default Logger;
