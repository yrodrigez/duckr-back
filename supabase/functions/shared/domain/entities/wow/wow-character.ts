export type Realm = {
    name: string;
    id: number;
    slug: string;
};

export type CharacterClass = {
    name: string;
    id: number;
};

export type PlayableClass = {
    id?: number;
    name?: string;
};

export type Guild = {
    name: string;
    id: number;
    rank: number;
};

export class WoWCharacter {
    public selectedRole?: string;
    constructor(
        public readonly id: number,
        public readonly wow_account_id: number = 0,
        public readonly name: string,
        public readonly realm: Realm,
        public readonly level: number,
        public readonly last_login_timestamp: number,
        public readonly character_class: CharacterClass,
        public readonly playable_class: PlayableClass,
        public readonly guild?: Guild,
        public readonly avatar?: string,
    ) {}

    withAvatar(avatar: string): WoWCharacter {
        return new WoWCharacter(
            this.id,
            this.wow_account_id,
            this.name,
            this.realm,
            this.level,
            this.last_login_timestamp,
            this.character_class,
            this.playable_class,
            this.guild,
            avatar,
        );
    }

    toJSON() {
        return {
            id: this.id,
            wow_account_id: this.wow_account_id,
            name: this.name,
            realm: this.realm,
            level: this.level,
            last_login_timestamp: this.last_login_timestamp,
            character_class: this.character_class,
            playable_class: this.playable_class,
            guild: this.guild,
            avatar: this.avatar,
        };
    }

    static fromApiResponse(data: any): WoWCharacter {
        return new WoWCharacter(
            data.id,
            data.wow_account_id,
            data.name,
            {
                name: data.realm?.name,
                slug: data.realm?.slug,
                id: data.realm?.id,
            },
            data.level,
            data.last_login_timestamp,
            {
                name: (data.playable_class || data.character_class)?.name,
                id: (data.playable_class || data.character_class)?.id,
            },
            {
                id: (data.playable_class || data.character_class)?.id,
                name: (data.playable_class || data.character_class)?.name,
            },
            data.guild
                ? {
                    name: data.guild.name,
                    id: data.guild.id,
                    rank: data.guild.rank,
                }
                : undefined,
            undefined, // avatar is not provided in the API response
        );
    }
}