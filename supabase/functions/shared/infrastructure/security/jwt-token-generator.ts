import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { TokenClaims } from "@entities/auth/token-claims.ts";
import { IJwtTokenGenerator } from "../../domain/repositories/i-jwt-token-generation.ts";
import { getEnvironment } from "../environment.ts";
import { createLogger } from "../logging/index.ts";

export class JwtTokenGenerator implements IJwtTokenGenerator {
    private logger = createLogger("JwtTokenGenerator");
    async generate(claims: TokenClaims): Promise<string> {
        this.logger.debug("Generating JWT token with claims", claims);
        const { jwtSecret, jwtExpiration, jwtKid } = getEnvironment();
        const encodedKey = new TextEncoder().encode(jwtSecret);
        const key = await crypto.subtle.importKey(
            "raw",
            encodedKey,
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign", "verify"],
        );
        this.logger.debug("Creating JWT token");
        const jwt = await create(
            { alg: "HS256", typ: "JWT", kid: jwtKid },
            { ...claims, exp: getNumericDate(jwtExpiration) },
            key,
        );
        this.logger.debug("JWT token generated successfully");
        return jwt;
    }
}
