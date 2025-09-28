import { DomainError } from "./domain-error.ts";

export class GetBlizzardTokenError extends DomainError {
	readonly code = "GET_BLIZZARD_TOKEN_ERROR";
	readonly statusCode = 500;

	constructor(message?: string) {
		super(message || "Failed to get Blizzard token");
	}
}
