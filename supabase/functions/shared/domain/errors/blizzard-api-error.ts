import { DomainError } from "./domain-error.ts";

export class BlizzardApiError extends DomainError {
	readonly code = "BLIZZARD_API_ERROR";
	readonly statusCode = 502;
	constructor(message: string) {
		super(message);
		this.name = "BlizzardApiError";
	}
}

