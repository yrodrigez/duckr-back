import { WoWCharacter } from "../../domain/entities/wow/wow-character.ts";
import { IMemberRepository } from "../../domain/repositories/i-member-repository.ts";
import { createLogger } from "../../infrastructure/logging/index.ts";
import { Member } from "../../domain/entities/member.ts";

export class SyncWowAccountCharactersUsecase {
    constructor(
        private readonly memberRepository: IMemberRepository,
        private readonly logger = createLogger(
            "SyncWowAccountCharactersUsecase",
        ),
    ) {}
    async execute(
        characters: WoWCharacter[],
        wowAccountId: number,
        source: string = "bnet_oauth",
    ): Promise<Member[]> {
        this.logger.info(
            `Syncing ${characters.length} characters for WoW Account ID: ${wowAccountId}`,
        );

        const syncedMembers: Member[] = [];

        await Promise.all(characters.map(async (character) => {
            this.logger.info(`Upserting character ${character.name} (ID: ${character.id})`);

            // Check if member already exists
            const existingMember = await this.memberRepository.findById(character.id);

            // Determine final registration source with override logic
            let finalSource = source;
            if (existingMember) {
                // Can only upgrade from 'temporal' to OAuth
                const isUpgradeFromTemporal =
                    existingMember.registrationSource === 'temporal' &&
                    source.includes('oauth');

                if (isUpgradeFromTemporal) {
                    this.logger.info(
                        `Upgrading character ${character.name} from temporal to ${source}`
                    );
                    finalSource = source;
                } else {
                    // Keep existing source, don't override
                    this.logger.info(
                        `Keeping existing source ${existingMember.registrationSource} for ${character.name}`
                    );
                    finalSource = existingMember.registrationSource;
                }
            }

            // Convert WoWCharacter to Member character format
            const memberCharacter = {
                id: character.id,
                name: character.name,
                realm: character.realm,
                level: character.level,
                "playable_class": {
                    name: character.playable_class.name || character.character_class.name,
                },
                "character_class": {
                    name: character.character_class.name,
                },
                guild: character.guild,
                avatar: character.avatar || "/avatar-anon.png",
                "last_login_timestamp": character.last_login_timestamp,
                selectedRole: character.selectedRole,
                rank: character.guild?.rank || 6,
            };

            const member = new Member(
                character.id,
                existingMember?.userId || undefined,
                wowAccountId,
                memberCharacter,
                finalSource,
                existingMember?.createdAt || new Date(),
                new Date(),
            );

            const upsertedMember = await this.memberRepository.upsert(member);
            syncedMembers.push(upsertedMember);
        }));

        this.logger.info(`Successfully synced ${syncedMembers.length} characters`);
        return syncedMembers;
    }
}
