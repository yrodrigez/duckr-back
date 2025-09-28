import { GetBlizzardToken } from "../shared/application/use-cases/get-blizzard-token.ts";
import { BlizzardTokenRepository } from "../shared/infrastructure/repositories/blizzard-token-repository.ts";
import { DatabaseClientFactory } from "../shared/infrastructure/database/database-client-factory.ts";
import { BlizzardApiClient } from "../shared/infrastructure/external/blizzard-api-client.ts";
import { DomainError } from "../shared/domain/errors/domain-error.ts";
import { createLogger } from "../shared/infrastructure/logging/index.ts";

Deno.serve(async () => {
	const logger = createLogger("everlasting-vendetta");

	try {
		logger.info("Processing Blizzard token request");

		const tokenRepository = new BlizzardTokenRepository(
			DatabaseClientFactory.getInstance(),
			new BlizzardApiClient(),
		);
		const getBlizzardTokenUseCase = new GetBlizzardToken(
			tokenRepository,
		);

		const token = await getBlizzardTokenUseCase.execute();

		logger.info("Successfully retrieved Blizzard token");

		return new Response(JSON.stringify({ token }), {
			headers: {
				"Content-type": "application/json",
			},
		});
	} catch (error: unknown) {
		if (error instanceof DomainError) {
			logger.error("Domain error occurred", error, { statusCode: error.statusCode });
			return new Response(JSON.stringify({ error: error.message }), {
				status: error.statusCode,
				headers: { "Content-Type": "application/json" },
			});
		}

		logger.critical("Unexpected error occurred", error);

		return new Response(
			JSON.stringify({
				error: error instanceof Error
					? error.message
					: "Internal Server Error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
});
