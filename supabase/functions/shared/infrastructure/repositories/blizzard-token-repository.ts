import ITokenRepository from "../../domain/repositories/i-token-repository.ts";
import { type DatabaseClient } from "../database/database-client-factory.ts";
import { type BlizzardOauthService } from "@external/blizzard-oauth-service.ts";
import BlizzardToken from "../../domain/entities/blizzard-token.ts";
import {
    TokenNotFoundError,
    TokenSaveError,
} from "../../domain/errors/blizzard-token-errors.ts";
import { createLogger } from "../logging/index.ts";

const TOKEN_DATABASE_TABLE = "blizzard_token";
export class BlizzardTokenRepository implements ITokenRepository {
    private logger = createLogger("BlizzardTokenRepository");

    constructor(
        private readonly database: DatabaseClient,
        private readonly blizzardApiClient: BlizzardOauthService,
    ) {}

    async getCurrentToken(): Promise<BlizzardToken> {
        this.logger.debug("Fetching current token from database");

        const { data, error } = await this.database
            .from(TOKEN_DATABASE_TABLE)
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            this.logger.error("Database error fetching token", error);
            throw new TokenNotFoundError(
                `Error fetching token: ${error.message || "Unknown error"}`,
            );
        }

        if (!data) {
            this.logger.warn("No token found in database");
            throw new TokenNotFoundError("No valid token found");
        }

        this.logger.debug("Successfully retrieved token from database");
        return BlizzardToken.fromDatabase({
            access_token: data.token,
            expires_at: new Date(data.expires_at),
            created_at: new Date(data.created_at),
        });
    }

    createNewToken(): Promise<BlizzardToken> {
        this.logger.debug("Requesting new token from Blizzard API");
        return this.blizzardApiClient.fetchToken();
    }

    async saveToken(token: BlizzardToken): Promise<BlizzardToken> {
        this.logger.debug("Saving token to database");

        const { data, error } = await this.database
            .from(TOKEN_DATABASE_TABLE)
            .insert({
                token: token.access_token,
                expires_at: token.expires_at,
            })
            .select("*")
            .maybeSingle();

        if (error) {
            this.logger.error("Database error saving token", error);
            throw new TokenSaveError(
                `Error saving token: ${error.message || "Unknown error"}`,
            );
        }

        if (!data) {
            this.logger.error("No data returned after token save");
            throw new TokenNotFoundError(
                "Failed to save token, no data returned from database",
            );
        }

        this.logger.debug("Successfully saved token to database");

        const savedToken = {
            created_at: data.created_at,
            access_token: data.token,
            expires_at: data.expires_at,
        } as BlizzardToken;

        return BlizzardToken.fromDatabase({
            access_token: savedToken.access_token,
            expires_at: new Date(savedToken.expires_at),
            created_at: new Date(savedToken.created_at),
        });
    }
}
