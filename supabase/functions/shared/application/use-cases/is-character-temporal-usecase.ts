import { MemberRepository } from "../../infrastructure/repositories/member-repository.ts";
import { createLogger } from "../../infrastructure/logging/index.ts";

export class IsCharacterTemporalUsecase {
    private readonly logger = createLogger("IsCharacterTemporalUsecase");
    constructor(private readonly memberRepository: MemberRepository) { }

    async execute(characterId: number): Promise<boolean> {
        this.logger.info(`Checking if character ID ${characterId} is temporal`);
        const character = await this.memberRepository.findById(characterId);
        this.logger.info(`Character ID ${characterId} registration source is: ${character?.registrationSource}`);
        return !character || !character.registrationSource.toLowerCase().includes('oauth');
    }
}