export interface IWowAccountRepository {
    upsert(account: { id: number; battletag: string; }): Promise<number>;
}