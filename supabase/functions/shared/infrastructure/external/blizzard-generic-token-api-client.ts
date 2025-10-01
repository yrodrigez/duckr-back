import { getEnvironment } from "../environment.ts";
import BlizzardToken from "../../domain/entities/blizzard-token.ts";
import { BlizzardApiError } from "../../domain/errors/blizzard-api-error.ts";
import { IBlizzardOAuthService } from "../../domain/services/i-blizzard-oauth-service.ts";

const environment = getEnvironment();
export class BlizzardOauthService implements IBlizzardOAuthService {

    private readonly checkTokenPath = "/check_token";
    private readonly userInfoPath = "/userinfo";
    private readonly region = environment.blizzardRegion;

    constructor(
        private readonly oauthUrl: string = "https://oauth.battle.net",
    ) { }

    async getUserInfo(accessToken: string): Promise<{ id: number; battletag: string; }> {
        const params = new URLSearchParams({
            region: this.region,
        });

        const response = await fetch(`${this.oauthUrl}${this.userInfoPath}?${params.toString()}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const text = await response.text();
            throw new BlizzardApiError(
                `Failed to fetch user info: ${response.statusText} - ${text}`,
            );
        }

        return response.json();
    }

    async checkTokenValidity(accessToken: string): Promise<boolean> {
        const params = new URLSearchParams({
            token: accessToken,
            region: this.region,
        });

        const response = await fetch(`${this.oauthUrl}${this.checkTokenPath}?${params.toString()}`, {
            method: "POST",
        });

        if (!response.ok) {
            const text = await response.text();
            throw new BlizzardApiError(
                `Failed to check token validity: ${response.statusText} - ${text}`,
            );
        }

        const data = await response.json();
        return data.scope && data.scope.includes("wow.profile");
    }

    private get refreshTokenHeaders() {
        const headers = new Headers();
        const { blizzardClientId, blizzardClientSecret } = getEnvironment();

        if (!blizzardClientId || !blizzardClientSecret) {
            throw new BlizzardApiError(
                `Blizzard Client ID or Secret not set in environment variables. Missing ${!blizzardClientId ? "BLIZZARD_CLIENT_ID" : ""
                } ${!blizzardClientSecret
                    ? "BLIZZARD_CLIENT_SECRET"
                    : ""
                } environment variable(s)`,
            );
        }

        headers.set("Content-Type", "application/x-www-form-urlencoded");
        headers.set(
            "Authorization",
            "Basic " + btoa(blizzardClientId + ":" + blizzardClientSecret),
        );

        return headers;
    }

    public async fetchToken(): Promise<BlizzardToken> {
        const body = new URLSearchParams({
            grant_type: "client_credentials",
            scope: "wow.profile",
        });

        const response = await fetch(`${this.oauthUrl}/token`, {
            method: "POST",
            headers: this.refreshTokenHeaders,
            body: body,
        });

        if (!response.ok) {
            const text = await response.text();
            throw new BlizzardApiError(
                `Failed to fetch new token: ${response.statusText} - ${text}`,
            );
        }
        const data = await response.json();
        console.log("Fetched new Blizzard token, expires in", data);
        return BlizzardToken.fromOAuthResponse(data);
    }
}
