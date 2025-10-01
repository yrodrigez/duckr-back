import { IWowAccountRepository } from "@repositories/i-wow-account-repository.ts";
import { IBlizzardOAuthService } from "../../domain/services/i-blizzard-oauth-service.ts";

export class SaveWowAccountUseCase {
    constructor(
        private wowAccountRepository: IWowAccountRepository,
        private blizzardOauthService: IBlizzardOAuthService,
    ) { }
    async execute(accessToken: string): Promise<number> {
        // Validate the token and get user info from Blizzard
        const isValid = await this.blizzardOauthService.checkTokenValidity(accessToken);
        if (!isValid) {
            throw new Error("Invalid or insufficient token");
        }

        // Get user info from Blizzard
        const userInfo = await this.blizzardOauthService.getUserInfo(accessToken);
        if (!userInfo) {
            throw new Error("Failed to retrieve user information");
        }

        // Save the WoW account using the repository
        const accountId = await this.wowAccountRepository.upsert(userInfo);
        return accountId;
    }
}