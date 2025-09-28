import { DomainError } from "./domain-error.ts";

export class DatabaseConfigurationError extends DomainError {
	readonly code = 'DB_CONFIG_ERROR';
	readonly statusCode = 500;

	constructor(message?: string) {
		super(message || 'Database configuration error');
	}
}
