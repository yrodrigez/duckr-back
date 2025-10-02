import { IWowAccountService } from "../../domain/repositories/i-wow-account-service.ts";
import { createLogger } from "../../infrastructure/logging/index.ts";
import { WoWCharacter } from "../../domain/entities/wow/wow-character.ts";

export class CharacterBelongsToAccountUsecase {
    constructor(
        private readonly wowAccountService: IWowAccountService,
        private readonly logger = createLogger(
            "CharacterBelongsToAccountUsecase",
        ),
    ) { }

    async execute(
        characterId: number,
        characterName: string,
        realmSlug: string,
    ): Promise<{
        belongs: boolean;
        characters: WoWCharacter[];
    }> {
        try {
            this.logger.info(
                `Checking if character ${characterName} on realm ${realmSlug} belongs to a member`,
            );
            const account = await this.wowAccountService.getWoWAccount();
            const accounts = account.wow_accounts;
            const characters = accounts.reduce(
                (acc, wowAccount) => acc.concat(wowAccount.characters),
                [] as WoWCharacter[]);
            this.logger.info(
                `Fetched ${characters.length} characters across ${accounts.length} accounts`,
            );
            const foundNames = characters.filter(
                (character) =>
                    character.realm.slug === realmSlug &&
                    character.name.toLowerCase() ===
                    characterName.toLowerCase() &&
                    character.id === characterId,
            ).map((c) => c.name).join(", ");
            this.logger.info(
                `Found ${foundNames.length} characters matching the criteria: ${foundNames}`,
            );
            return { belongs: foundNames.length > 0, characters };
        } catch (e: unknown) {
            this.logger.error(
                `Error checking character ownership`, e
            );
            throw new Error(
                `Error checking character ownership: ${(e as Error).message}`,
            );
        }
    }
}
