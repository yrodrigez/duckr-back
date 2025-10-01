import { IRoleRepository } from "../../domain/repositories/i-role-repository.ts";
import { createLogger } from "../logging/index.ts";
import {DatabaseClient} from "../database/database-client-factory.ts";

export class RoleRepository implements IRoleRepository {
    constructor(
        private readonly database: DatabaseClient,
        private logger = createLogger("RoleRepository"),
    ) {}

    async findByMemberId(memberId: number): Promise<string[]> {
        this.logger.debug(`Fetching roles for member ID: ${memberId}`);
        const { data, error } = await this.database
            .from("ev_member_role")
            .select("role")
            .eq("member_id", memberId)
            .returns<{ role: string }[]>();

        if (error) {
            this.logger.error(
                `Error fetching roles for member ${memberId}:`,
                error,
            );
            throw new Error(
                `Error fetching roles for member ${memberId}: ${error.message}`,
            );
        }

        if (!data) {
            this.logger.warn(`No roles found for member ID: ${memberId}`);
            return [];
        }

        this.logger.debug(
            `Found ${data.length} roles for member ID: ${memberId}`,
        );
        return data.map(({ role }) => role);
    }
}
