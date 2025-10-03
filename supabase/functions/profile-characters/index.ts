import { createEdgeFunction } from "@http/edge-function-handler.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import WowAccountService from "@external/wow-account-service.ts";
import { GetRealmCharactersUseCase } from "@use-cases/get-realm-characters-usecase.ts";
import GetFullCharactersUsecase from "@use-cases/get-full-characters-usecase.ts";
import { WowCharacterService } from "@external/wow-character-service.ts";
import { SaveWowAccountUseCase } from "@use-cases/save-wow-account-usecase.ts";
import { WowAccountRepository } from "../shared/infrastructure/repositories/wow-account-repository.ts";
import { DatabaseClientFactory } from "@database/database-client-factory.ts";
import { BlizzardOauthService } from "@external/blizzard-oauth-service.ts";
import { MemberRepository } from "../shared/infrastructure/repositories/member-repository.ts";
import { SyncWowAccountCharactersUsecase } from "@use-cases/sync-wow-account-characters-usecase.ts";

const requestSchema = z.object({
    bnetToken: z.string().min(1),
    realmSlug: z.string().min(1),
});

createEdgeFunction({
    functionName: "profile-characters",
    inputSchema: requestSchema,
    allowedMethods: ["POST", "OPTIONS"],
    cors: {
        origin: ["localhost:3000", "https://everlastingvendetta.com"],
        allowedMethods: ["POST", "OPTIONS"],
    }
}, async ({ logger, input }) => {
    const { bnetToken, realmSlug } = input;
    logger.info("Fetching characters for realm", { realmSlug });

    const databaseClient = DatabaseClientFactory.getInstance();

    const accountId = await new SaveWowAccountUseCase(
        new WowAccountRepository(databaseClient),
        new BlizzardOauthService()
    ).execute(bnetToken);

    const accountCharacters = await new GetRealmCharactersUseCase(new WowAccountService(bnetToken), { realm: realmSlug }).execute();

    const characters = await new GetFullCharactersUsecase(new WowCharacterService(bnetToken)).execute(
        accountCharacters.map((char) => ({
            name: char.name,
            realmSlug: char.realm.slug,
            level: char.level,
        })).filter((char) => char.level >= 10),
    );

    await new SyncWowAccountCharactersUsecase(new MemberRepository(databaseClient)).execute(characters, accountId, "bnet_oauth");

    return characters;
});