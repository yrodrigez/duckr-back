import { TokenClaims } from "@entities/auth/token-claims.ts";

export interface IJwtTokenGenerator {
	generate(claims: TokenClaims): Promise<string>;
}