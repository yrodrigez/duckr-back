import { WoWCharacter } from "@entities/wow/wow-character.ts";
import { type IWowAccountService } from "../../domain/repositories/i-wow-account-service.ts";

export class GetRealmCharactersUseCase {
	constructor(
		private readonly wowProfileApi: IWowAccountService,
		private config: { realm: string },
	) {}

	async execute() {
		const profileSummary = await this.wowProfileApi.getWoWAccount();

		return profileSummary.wow_accounts.map((wowAccount) => {
			return wowAccount.filterByRealm(this.config.realm);
		}).reduce(
			(acc, val) => acc.concat(val.characters),
			[] as WoWCharacter[],
		);
	}
}
