import { WoWAccount } from "./wow-account.ts";

export class WowUserProfile {
	constructor(
		public readonly id: number,
		public readonly wow_accounts: WoWAccount[],
	) {}

	public static fromApiResponse(data: any): WowUserProfile {
		const {id, wow_accounts} = data;
		return new WowUserProfile(
			id,
			wow_accounts.map((account: any) => WoWAccount.fromApiResponse(account)),
		);
	}
}
