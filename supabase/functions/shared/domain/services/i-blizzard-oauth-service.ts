import BlizzardToken from "@entities/blizzard-token.ts";

export interface IBlizzardOAuthService {
    fetchToken(): Promise<BlizzardToken>;
    getUserInfo(accessToken: string): Promise<{id: number, battletag: string}>;
    checkTokenValidity(accessToken: string): Promise<boolean>;
}