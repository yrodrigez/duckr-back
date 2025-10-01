import { IWowAccountRepository } from "@repositories/i-wow-account-repository.ts";
import { DatabaseClient } from "@database/database-client-factory.ts";
import { WowAccountRepositoryError } from "@errors/wow-account-repository-error.ts";

export class WowAccountRepository implements IWowAccountRepository {
    constructor(
        private readonly db: DatabaseClient,
    ) { }

    async upsert(account: { id: number; battletag: string; }): Promise<number> {
        const { data, error } = await this.db
            .from("wow_account")
            .upsert({ id: account.id, battletag: account.battletag, modified: new Date() }, { onConflict: "id", ignoreDuplicates: false })
            .select("id")
            .maybeSingle();

        if (error) {
            throw new WowAccountRepositoryError(`Failed to upsert account: ${error.message}`);
        }

        if (!data) {
            throw new WowAccountRepositoryError("Failed to upsert account: No data returned");
        }

        return data.id;
    }
}