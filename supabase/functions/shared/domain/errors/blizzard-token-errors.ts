import { DomainError } from "./domain-error.ts";

export class TokenNotFoundError extends DomainError {
	readonly code = 'TOKEN_NOT_FOUND';
	readonly statusCode = 404;

	constructor(message?: string) {
		super(message || 'Token not found');
	}
}

export class TokenExpiredError extends DomainError {
	readonly code = 'TOKEN_EXPIRED';
	readonly statusCode = 401;
}

export class TokenSaveError extends DomainError {
	readonly code = 'TOKEN_SAVE_ERROR';
	readonly statusCode = 500;

	constructor(message?: string) {
		super(message || 'Failed to save token');
	}
}