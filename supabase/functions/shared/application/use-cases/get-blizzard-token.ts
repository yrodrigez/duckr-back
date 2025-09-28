import ITokenRepository from "../../domain/repositories/i-token-repository.ts";
import { DomainError } from "../../domain/errors/domain-error.ts";
import { GetBlizzardTokenError } from "../../domain/errors/get-blizzard-token-error.ts";
import { createLogger } from "../../infrastructure/logging/index.ts";

export class GetBlizzardToken {
	private logger = createLogger("GetBlizzardToken");

	constructor(
		private tokenRepository: ITokenRepository,
	) {}

	async execute(): Promise<string> {
		try {
			this.logger.debug("Starting Blizzard token retrieval");

			const currentToken = await this.tokenRepository.getCurrentToken();
			if (!currentToken.isExpired()) {
				this.logger.debug("Using existing valid token");
				return currentToken.access_token;
			}

			this.logger.info("Token expired, creating new token");
			const newToken = await this.tokenRepository.createNewToken();
			await this.tokenRepository.saveToken(newToken);

			this.logger.info("Successfully created and saved new token");
			return newToken.access_token;
		} catch (error: unknown) {
			if (error instanceof DomainError) {
				this.logger.warn("Domain error in token retrieval", { error: error.message });
				throw error;
			}

			this.logger.error("Unexpected error in token retrieval", error);
			throw new GetBlizzardTokenError(
				`An unexpected error occurred while getting Blizzard token: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}
}
