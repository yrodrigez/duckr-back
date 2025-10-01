import { IAdminRepository } from "@repositories/i-admin-repository.ts";
import { DatabaseClient } from "@database/database-client-factory.ts";
import { createLogger } from "../logging/index.ts";

export class AdminRepository implements IAdminRepository {
    private logger = createLogger("AdminRepository");
    constructor(
        private readonly database: DatabaseClient,
    ) {
    }

    async isAdmin(userId: number): Promise<boolean> {
        this.logger.debug(`Checking if user ID ${userId} is an admin`);
        const { data, error } = await this.database
            .from("ev_admin")
            .select("id")
            .eq("id", userId)
            .limit(1)
            .single();


        if (error) {
            this.logger.error(`Error checking admin status for user ID ${userId}:`, error);
            return false;
        }
        this.logger.debug(`User ID ${userId} admin status: ${!!data}`);
        return !!data;
    }
}
