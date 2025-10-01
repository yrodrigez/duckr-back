import { DomainError } from "./domain-error.ts";

export class GenerateTokenError extends DomainError {
    private readonly statusCode = 500;
    private readonly code = "GENERATE_TOKEN_ERROR";

    constructor(message: string) {
        super(`GenerateTokenError: ${message}`);
    }
}
