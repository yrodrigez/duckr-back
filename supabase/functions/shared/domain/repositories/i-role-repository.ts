export interface IRoleRepository {
	findByMemberId(memberId: number): Promise<string[]>;
}