import { BlizzardApiError } from "../../domain/errors/blizzard-api-error.ts";
import { WowUserProfile } from "../../domain/entities/wow/wow-user-profile.ts";
import { type IWowAccountService } from "../../domain/repositories/i-wow-account-service.ts";
import BlizzardApi from "./blizzard-api.ts";

export default class WowAccountService extends BlizzardApi
	implements IWowAccountService {
	private readonly namespace: string = "profile-classic1x-eu";

	constructor(
		override readonly token: string,
	) {
		super(token);
	}

	async getWoWAccount(): Promise<WowUserProfile> {
		const response = await fetch(
			this.createUrl(
				"profile/user/wow",
				{
					namespace: this.namespace,
				},
			),
			{
				headers: {
					"Authorization": `Bearer ${this.token}`,
				},
			},
		);

		if (!response.ok) {
			const errorData = await response.text();
			throw new BlizzardApiError(
				`Failed to fetch profile summary: ${response.status} ${response.statusText} - ${errorData}`,
			);
		}

		const data = await response.json();

		return WowUserProfile
			.fromApiResponse(data);
	}
}
