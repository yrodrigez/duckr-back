import { IPermissionRepository } from "../../domain/repositories/i-permission-repository.ts";
import { DatabaseClient } from "../database/database-client-factory.ts";
import { createLogger } from "../logging/index.ts";

export class PermissionRepository implements IPermissionRepository {
    constructor(
        private readonly database: DatabaseClient,
        private readonly logger = createLogger("PermissionRepository"),
    ) { }

    async findByRoles(roleNames: string[]): Promise<string[]> {
        this.logger.debug(
            `Fetching permissions for roles: ${roleNames.join(", ")}`,
        );
        const { data, error } = await this.database
            .from("ev_role_permissions")
            .select("id")
            .in("role", roleNames);

        if (error) {
            this.logger.error("Database error fetching permissions", error);
            throw new Error(
                `Error fetching permissions: ${error.message || "Unknown error"
                }`,
            );
        }

        if (!data) {
            this.logger.warn("No permissions found for given roles");
            return [];
        }

        const permissions = new Set(data.map((row) => row.id));
        this.logger.debug(`Found permissions: ${Array.from(permissions).join(", ")}`);
        return [...permissions];
    }
}
