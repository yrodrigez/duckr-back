import BlizzardToken from "../entities/blizzard-token.ts";

export default interface ITokenRepository {
	getCurrentToken(): Promise<BlizzardToken>;
	saveToken(token: BlizzardToken): Promise<BlizzardToken>;
	createNewToken(): Promise<BlizzardToken>;
}
