import { BlizzardApiError } from "../../domain/errors/blizzard-api-error.ts";

export default abstract class BlizzardApi {
	protected readonly locale = "en_us";
	protected readonly baseUrl = "https://eu.api.blizzard.com";
	protected constructor(protected readonly token: string) {
		if (!token) {
			throw new BlizzardApiError(
				"No token provided for Blizzard API",
			);
		}
	}

	private sanitizeUrl(url: string): string {
		return url.trim().replace(/\/+/g, "/");
	}

	protected createUrl(
		path: string,
		params?: Record<string, string | number | boolean>,
	): string {
		if (!path.startsWith("/")) {
			path = `/${path}`;
		}
		const url = new URL(this.sanitizeUrl(`${this.baseUrl}${path}`));
		url.searchParams.append("locale", this.locale);
		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				url.searchParams.append(key, String(value));
			});
		}
		return url.toString();
	}
}
