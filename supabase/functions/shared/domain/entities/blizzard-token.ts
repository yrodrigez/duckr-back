export default class BlizzardToken {
	constructor(
		public access_token: string,
		public created_at: Date,
		public expires_at: Date,
	) {}

	static fromDatabase(data: { access_token: string; created_at: Date; expires_at: Date; }) {
		return new BlizzardToken(
			data.access_token,
			data.created_at,
			data.expires_at,
		);
	}

	static fromOAuthResponse(tokenData: { access_token: string; expires_in: number; }) {
		const createdAt = new Date();
		const expiresAt = new Date(createdAt.getTime() + tokenData.expires_in * 1000);
		return new BlizzardToken(
			tokenData.access_token,
			createdAt,
			expiresAt,
		);
	}

	isExpired() {
		return new Date() >= this.expires_at;
	}
}