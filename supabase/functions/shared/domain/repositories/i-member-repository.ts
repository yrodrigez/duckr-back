import { Member } from "../entities/member.ts";

export interface IMemberRepository {
    findById(id: number): Promise<Member | null>;
    findAll(): Promise<Member[]>;
    save(member: Member): Promise<Member>;
    update(member: Member): Promise<Member>;
    upsert(member: Member): Promise<Member>;
}