export interface IPermissionRepository {
	findByRoles(roleNames: string[]): Promise<string[]>;
}