import { IMemberRepository } from "../../domain/repositories/i-member-repository.ts";
import { Member } from "../../domain/entities/member.ts";
import { DatabaseClient } from "../database/database-client-factory.ts";
import { MemberRepositoryError } from "../../domain/errors/member-repository-error.ts";

const MEMBER_TABLE = "ev_member";

export class MemberRepository implements IMemberRepository {
    constructor(private readonly database: DatabaseClient) {}

    async findById(id: number): Promise<Member | null> {
        const { data, error } = await this.database
            .from(MEMBER_TABLE)
            .select("*")
            .eq("id", id)
            .limit(1)
            .maybeSingle();

        if (error) {
            throw new MemberRepositoryError(
                `Error fetching member by ID: ${
                    error.message || "Unknown error"
                }`,
            );
        }

        if (!data) {
            return null;
        }

        return Member.fromDB(data);
    }

    async findAll(): Promise<Member[]> {
        const { data, error } = await this.database
            .from(MEMBER_TABLE)
            .select("*");

        if (error) {
            throw new MemberRepositoryError(
                `Error fetching all members: ${
                    error.message || "Unknown error"
                }`,
            );
        }
        if (!data) {
            return [];
        }

        return data.map((row) => Member.fromDB(row));
    }

    async save(member: Member): Promise<Member> {
        const memberData = {
            character: member.character,
            user_id: member.userId,
            wow_account_id: member.wowAccountId,
            registration_source: member.registrationSource,
        };

        const { data, error } = await this.database
            .from(MEMBER_TABLE)
            .insert(memberData)
            .select()
            .maybeSingle();

        if (error) {
            if (error.code === "23505") { // Unique violation
                throw new MemberRepositoryError(
                    "Member with this user ID or WoW account ID already exists.",
                );
            }
            throw new MemberRepositoryError(
                `Error saving member: ${error.message || "Unknown error"}`,
            );
        }

        if (!data) {
            throw new MemberRepositoryError(
                "Failed to save member, no data returned from database",
            );
        }

        return Member.fromDB(data);
    }

    async update(member: Member): Promise<Member> {
        const memberData = {
            character: member.character,
            user_id: member.userId,
            wow_account_id: member.wowAccountId,
            registration_source: member.registrationSource,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await this.database
            .from(MEMBER_TABLE)
            .update(memberData)
            .eq("id", member.id)
            .select()
            .maybeSingle();

        if (error) {
            if (error.code === "23505") { // Unique violation
                throw new MemberRepositoryError(
                    "Member with this user ID or WoW account ID already exists.",
                );
            }
            throw new MemberRepositoryError(
                `Error updating member: ${error.message || "Unknown error"}`,
            );
        }

        if (!data) {
            throw new MemberRepositoryError(
                "Failed to update member, no data returned from database",
            );
        }

        return Member.fromDB(data);
    }

    async upsert(member: Member): Promise<Member> {
        const memberData = {
            id: member.id,
            character: member.character,
            "user_id": member.userId,
            "wow_account_id": member.wowAccountId,
            "registration_source": member.registrationSource,
            "updated_at": new Date().toISOString(),
        };

        const { data, error } = await this.database
            .from(MEMBER_TABLE)
            .upsert(memberData, { onConflict: "id" })
            .select()
            .maybeSingle();

        if (error) {
            if (error.code === "23505") { // Unique violation
                throw new MemberRepositoryError(
                    "Member with this user ID or WoW account ID already exists.",
                );
            }
            throw new MemberRepositoryError(
                `Error upserting member: ${error.message || "Unknown error"}`,
            );
        }

        if (!data) {
            throw new MemberRepositoryError(
                "Failed to upsert member, no data returned from database",
            );
        }

        return Member.fromDB(data);
    }
}
