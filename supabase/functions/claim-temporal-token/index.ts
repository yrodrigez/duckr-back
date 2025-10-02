import { createLogger } from "../shared/infrastructure/logging/logger.ts";
import { requestContext } from "../shared/infrastructure/logging/request-context.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { ResponseMapper } from "../shared/utils/map-error.ts";
import { DatabaseClientFactory } from "@database/database-client-factory.ts";
import { MemberRepository } from "../shared/infrastructure/repositories/member-repository.ts";
import { IsCharacterTemporalUsecase } from "@use-cases/is-character-temporal-usecase.ts";
import { BlizzardOauthService } from "@external/blizzard-oauth-service.ts";
import { GenerateEvTokenUsecase } from "@use-cases/generate-ev-token-usecase.ts";
import { GetBlizzardToken } from "@use-cases/get-blizzard-token.ts";
import { BlizzardTokenRepository } from "../shared/infrastructure/repositories/blizzard-token-repository.ts";
import { AdminRepository } from "../shared/infrastructure/repositories/admin-repository.ts";
import { PermissionRepository } from "../shared/infrastructure/repositories/permission-repository.ts";
import { RoleRepository } from "../shared/infrastructure/repositories/role-repository.ts";
import { JwtTokenGenerator } from "../shared/infrastructure/security/jwt-token-generator.ts";
import GetFullCharactersUsecase from "@use-cases/get-full-characters-usecase.ts";
import { WowCharacterService } from "@external/wow-character-service.ts";
import { SyncWowAccountCharactersUsecase } from "@use-cases/sync-wow-account-characters-usecase.ts";

const CharacterSchema = z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    realm: z.object({
        slug: z.string().min(1),
    }),
    level: z.number().min(1),
    selectedRole: z.string().min(1),
});

Deno.serve((req: Request) => {
    const requestId = crypto.randomUUID();

    return requestContext.run({ requestId }, async () => {
        const logger = createLogger("claim-temporal-token");
        logger.info("Request started");
        const source = "temporal";
        if (req.method !== 'POST') {
            logger.warn("Method not allowed", { method: req.method });
            return ResponseMapper.error({
                message: "Method Not Allowed",
                statusCode: 405,
                code: "METHOD_NOT_ALLOWED",
            }, requestId);
        }

        const requestBody = await req.json()
        const parseResult = CharacterSchema.safeParse(requestBody);
        if (!parseResult.success) {
            logger.error("Invalid request body", undefined, { errors: parseResult.error.errors });
            return ResponseMapper.error({
                message: 'Bad Request: Invalid request body',
                statusCode: 400,
                code: "BAD_REQUEST",
            }, requestId);
        }
        const selectedCharacter = parseResult.data;

        try {
            const databaseClient = DatabaseClientFactory.getInstance();
            const memberRepository = new MemberRepository(databaseClient);
            const isCharacterTemporalUsecase = new IsCharacterTemporalUsecase(memberRepository);
            const isTemporal = await isCharacterTemporalUsecase.execute(selectedCharacter.id);
            if (!isTemporal) {
                logger.warn("Character is not temporal", { characterId: selectedCharacter.id });
                return ResponseMapper.error({
                    message: 'Character is not temporal',
                    statusCode: 403,
                    code: "FORBIDDEN",
                }, requestId);
            }

            const tokenRepository = new BlizzardTokenRepository(
                DatabaseClientFactory.getInstance(),
                new BlizzardOauthService(),
            );

            const getBlizzardTokenUseCase = new GetBlizzardToken(
                tokenRepository,
            );

            const token = await getBlizzardTokenUseCase.execute();

            const characters = new GetFullCharactersUsecase(new WowCharacterService(token));
            const [actualCharacter] = await characters.execute([{
                realmSlug: selectedCharacter.realm.slug,
                name: selectedCharacter.name,
                level: selectedCharacter.level
            }]);

            const syncCharacters = new SyncWowAccountCharactersUsecase(memberRepository);
            const [member] = await syncCharacters.execute([actualCharacter].map(c => {
                if (c.id === selectedCharacter.id) {
                    logger.info("Setting selected role for character", {
                        characterName: c.name,
                        selectedRole: selectedCharacter.selectedRole
                    });
                    c.selectedRole = selectedCharacter.selectedRole;
                }
                return c;
            }), 0, source);
            const generateEvTokenUsecase = new GenerateEvTokenUsecase(
                new AdminRepository(databaseClient),
                new PermissionRepository(databaseClient),
                new RoleRepository(databaseClient),
                new JwtTokenGenerator(),
            );
            const tokenResponse = await generateEvTokenUsecase.execute(
                actualCharacter, token, source, member.userId ?? ''
            );
            return ResponseMapper.success({ ...tokenResponse }, requestId);
        } catch (error: unknown) {
            logger.critical("Unexpected error occurred", error);
            return ResponseMapper.error(error, requestId);
        }

    });
});

