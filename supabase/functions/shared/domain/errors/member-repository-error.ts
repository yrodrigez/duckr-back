import {DomainError} from "./domain-error.ts";

export class MemberRepositoryError extends DomainError {
	private readonly statusCode: number;
	private readonly code: string;
	constructor(message: string) {
		super(`MemberRepositoryError: ${message}`);
		this.statusCode = 500;
		this.code = 'MEMBER_REPOSITORY_ERROR';
	}
}