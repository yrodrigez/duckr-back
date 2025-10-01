export interface IAdminRepository {
    isAdmin(userId: number): Promise<boolean>;
}
