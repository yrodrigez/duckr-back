import { DomainError } from "./domain-error.ts";

export class WowAccountRepositoryError extends DomainError {
    public readonly code: string = "WOW_ACCOUNT_REPOSITORY_ERROR";
    public readonly statusCode: number = 500;

    constructor(message: string) {
        super(message);
    }
}