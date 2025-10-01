import { WoWCharacter } from "./wow-character.ts";

export class WoWAccount {
    constructor(
        public readonly id: number,
        public readonly characters: WoWCharacter[] = [],
    ) {}

    filterByRealm(realm: string | string[]): WoWAccount {
        return new WoWAccount(
            this.id,
            this.characters.filter((character) => {
                if (Array.isArray(realm)) {
                    return realm.includes(character.realm.slug);
                }

                return character.realm.slug === realm;
            }),
        );
    }

    static fromApiResponse(account: any): WoWAccount {
        const { id, characters } = account;
        return new WoWAccount(
            id,
            characters?.map((char: any) =>
                WoWCharacter.fromApiResponse({ ...char, wow_account_id: id })
            ) || [],
        );
    }
}
