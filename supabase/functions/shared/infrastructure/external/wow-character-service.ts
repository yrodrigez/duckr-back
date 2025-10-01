import BlizzardApi from "./blizzard-api.ts";
import { WoWCharacter } from "../../domain/entities/wow/wow-character.ts";
import { BlizzardApiError } from "../../domain/errors/blizzard-api-error.ts";
import { IWowCharacterService } from "../../domain/repositories/i-wow-character-service.ts";

export class WowCharacterService extends BlizzardApi
	implements IWowCharacterService {
	private readonly namespace = "profile-classic1x-eu";
	constructor(
		token: string,
	) {
		super(token);
	}

	async getCharacter(realmSlug: string, characterName: string): Promise<WoWCharacter> {
		const response = await fetch(
			this.createUrl(
				`/profile/wow/character/${realmSlug}/${characterName.toLowerCase()}`,
				{ namespace: this.namespace },
			),
			{
				headers: {
					"Authorization": `Bearer ${this.token}`,
				},
			},
		);

		if (!response.ok) {
			const text = await response.text();
			console.error(
				"Error fetching character data:",
				response.status,
				text,
			);
			throw new BlizzardApiError(
				`Error fetching character data: ${response.status} - ${text}`,
			);
		}

		const data = await response.json();

		return WoWCharacter.fromApiResponse(data);
	}

	async getCharacterAvatar(realmSlug: string, characterName: string): Promise<string> {
		const response = await fetch(
			this.createUrl(
				`/profile/wow/character/${realmSlug}/${characterName.toLowerCase()}/character-media`,
				{ namespace: this.namespace },
			),
			{
				headers: {
					"Authorization": `Bearer ${this.token}`,
				},
			},
		);

		if (!response.ok) {
			const text = await response.text();
			throw new BlizzardApiError(
				`Error fetching character avatar: ${response.status} - ${text}`,
			);
		}

		const data = await response.json();
		const avatarObject =
			data?.assets?.find((asset: { key: string; value: string }) => asset?.key === "avatar") ??
			{ value: "/avatar-anon.png" };

		return avatarObject.value;
	}
}
