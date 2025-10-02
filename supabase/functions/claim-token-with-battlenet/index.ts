import { CharacterBelongsToAccountUsecase } from "@use-cases/character-belongs-to-account-usecase.ts";
import WowAccountService from "@external/wow-account-service.ts";
import { BlizzardOauthService } from "@external/blizzard-oauth-service.ts";
import { WowAccountRepository } from "../shared/infrastructure/repositories/wow-account-repository.ts";
import { DatabaseClientFactory } from "@database/database-client-factory.ts";
import { SaveWowAccountUseCase } from "@use-cases/save-wow-account-usecase.ts";
import { SyncWowAccountCharactersUsecase } from "@use-cases/sync-wow-account-characters-usecase.ts";
import { MemberRepository } from "../shared/infrastructure/repositories/member-repository.ts";
import { ResponseMapper } from "../shared/utils/map-error.ts";
import GetFullCharactersUsecase from "@use-cases/get-full-characters-usecase.ts";
import { WowCharacterService } from "@external/wow-character-service.ts";
import { JwtTokenGenerator } from "../shared/infrastructure/security/jwt-token-generator.ts";
import { GenerateEvTokenUsecase } from "@use-cases/generate-ev-token-usecase.ts";
import { AdminRepository } from "../shared/infrastructure/repositories/admin-repository.ts";
import { PermissionRepository } from "../shared/infrastructure/repositories/permission-repository.ts";
import { RoleRepository } from "../shared/infrastructure/repositories/role-repository.ts";
import { createLogger } from "../shared/infrastructure/logging/logger.ts";
import { requestContext, getRequestId } from "../shared/infrastructure/logging/request-context.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const CharacterSchema = z.object({
	id: z.number().int().positive(),
	name: z.string().min(1),
	realm: z.object({
		slug: z.string().min(1),
	}),
	selectedRole: z.string().min(1),
});

const RequestSchema = z.object({
	blizzardToken: z.string().min(1),
	selectedCharacter: CharacterSchema,
});

Deno.serve((req: Request) => {
	const requestId = crypto.randomUUID();

	return requestContext.run({ requestId }, async () => {
		const logger = createLogger("claim-token-with-battlenet");
		logger.info("Request started");

		if (req.method !== 'POST') {
			logger.warn("Method not allowed", { method: req.method });
			return new Response(
				JSON.stringify({ error: 'Method Not Allowed', request_id: getRequestId() }),
				{ status: 405, headers: { "Content-Type": "application/json" } },
			);
		}

		const source = "bnet_oauth";
		const requestBody = await req.json()
		const parseResult = RequestSchema.safeParse(requestBody);
		if (!parseResult.success) {
			logger.error("Invalid request body", undefined, { errors: parseResult.error.errors });
			return new Response(
				JSON.stringify({ error: true, message: 'Bad Request: Invalid request body', request_id: getRequestId() }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const { blizzardToken, selectedCharacter } = parseResult.data;

		try {
			const blizzardOauthService = new BlizzardOauthService();
			const databaseClient = DatabaseClientFactory.getInstance();
			const wowAccountRepository = new WowAccountRepository(databaseClient);

			const saveWowAccountUseCase = new SaveWowAccountUseCase(wowAccountRepository, blizzardOauthService);
			const accountId = await saveWowAccountUseCase.execute(blizzardToken);

			const wowAccountService = new WowAccountService(blizzardToken);
			const characterBelongsUseCase = new CharacterBelongsToAccountUsecase(wowAccountService)
			logger.info("Verifying character ownership", { characterId: selectedCharacter.id, characterName: selectedCharacter.name });
			const { belongs, characters } = await characterBelongsUseCase.execute(selectedCharacter.id, selectedCharacter.name, selectedCharacter.realm.slug);
			if (!belongs) {
				logger.error("Character does not belong to account", undefined, { characterId: selectedCharacter.id });
				return ResponseMapper.error(
					{ message: "Character does not belong to the authenticated account", code: 'CHARACTER_NOT_FOUND', statusCode: 403 },
					getRequestId()
				);
			}
			const getFullCharactersUsecase = new GetFullCharactersUsecase(new WowCharacterService(blizzardToken));
			const fullCharacters = await getFullCharactersUsecase.execute(characters.map(c => ({ ...c, name: c.name, realmSlug: c.realm.slug })));
			const memberRepository = new MemberRepository(databaseClient);
			const syncCharacters = new SyncWowAccountCharactersUsecase(memberRepository);
			const members = await syncCharacters.execute(fullCharacters.map(c => {
				if (c.id === selectedCharacter.id) {
					logger.info("Setting selected role for character", {
						characterName: c.name,
						selectedRole: selectedCharacter.selectedRole
					});
					c.selectedRole = selectedCharacter.selectedRole;
				}
				return c;
			}), accountId, source);

			const actualCharacter = fullCharacters.find(c => c.id === selectedCharacter.id);
			if (!actualCharacter) {
				logger.error("Character not found after sync", undefined, { characterId: selectedCharacter.id });
				return ResponseMapper.error(
					{ message: 'Character not found after sync', code: 'CHARACTER_NOT_FOUND', statusCode: 500 },
					getRequestId()
				);
			}

			const generateTokenUseCase = new GenerateEvTokenUsecase(
				new AdminRepository(databaseClient),
				new PermissionRepository(databaseClient),
				new RoleRepository(databaseClient),
				new JwtTokenGenerator(),
			);

			const member = members.find(m => m.id === actualCharacter.id);
			if (!member) {
				logger.error("Member not found for character", undefined, { characterId: actualCharacter.id });
				return ResponseMapper.error(
					{ message: 'Member not found for character', code: 'MEMBER_NOT_FOUND', statusCode: 500 },
					getRequestId()
				);
			}

			logger.info("Generating EV token", { characterId: actualCharacter.id });
			const tokenInfo = await generateTokenUseCase.execute(actualCharacter, blizzardToken, source, member?.userId || '');

			logger.info("Request completed successfully");
			return ResponseMapper.success(tokenInfo, getRequestId());
		} catch (e: unknown) {
			logger.error("Request failed with error", e);
			return ResponseMapper.error(e, getRequestId());
		}
	});
});
