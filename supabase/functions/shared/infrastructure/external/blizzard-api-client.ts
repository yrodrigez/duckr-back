import getEnvironment from "../environment.ts";
import BlizzardToken from "../../domain/entities/blizzard-token.ts";
import { BlizzardApiError } from "../../domain/errors/blizzard-api-error.ts";

export class BlizzardApiClient {
	public readonly allowedRealms = [
		"living-flame",
		"spineshatter",
	];
	public readonly allowedGuilds = [
		"everlasting-vendetta",
	];

	constructor(
		private readonly baseUrl: string = "https://eu.api.blizzard.com",
		private readonly oauthUrl: string = "https://oauth.battle.net",
		private readonly token: string = "",
		private readonly profileNamespace: string = "profile-classic1x-eu",
		private readonly staticNamespace: string = "static-classic1x-eu",
		private readonly dynamicNamespace: string = "dynamic-classic1x-eu",
		private readonly locale: string = "en_US",
	) {}

	private get authHeaders() {
		if (!this.token) {
			throw new BlizzardApiError("Token not provided for authenticated requests.");
		}
		const headers = new Headers();
		headers.set("Authorization", `Bearer ${this.token}`);
		return headers;
	}

	private get refreshTokenHeaders() {
		const headers = new Headers();
		const { blizzardClientId, blizzardClientSecret } = getEnvironment();

		if (!blizzardClientId || !blizzardClientSecret) {
			throw new BlizzardApiError(
				`Blizzard Client ID or Secret not set in environment variables. Missing ${
					!blizzardClientId ? "BLIZZARD_CLIENT_ID" : ""
				} ${
					!blizzardClientSecret
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
