export type MemberCharacter = {
    id: number;
    name: string;
    realm: {
        id: number;
        name: string;
        slug: string;
    };
    level: number;
    playable_class: {
        name: string;
    };
    character_class: {
        name: string;
    };
    guild?: {
        id: number;
        name: string;
        rank: number;
    };
    avatar: string;
    last_login_timestamp: number;
};

export class Member {
    constructor(
        public readonly id: number,
        public readonly userId: string | undefined,
        public readonly wowAccountId: number,
        public readonly character: MemberCharacter,
        public readonly registrationSource: string,
        public readonly createdAt: Date,
        public readonly updatedAt?: Date,
    ) { }

    static fromDB(row: any): Member {
        return new Member(
            row.id,
            row.user_id,
            row.wow_account_id,
            {
                id: row.character.id,
                name: row.character.name,
                realm: {
                    id: row.character.realm.id,
                    name: row.character.realm.name,
                    slug: row.character.realm.slug,
                },
                level: row.character.level,
                playable_class: {
                    name: row.character.playable_class.name,
                },
                character_class: {
                    name: row.character.character_class.name,
                },
                guild: row.character.guild?.id
                    ? {
                        id: row.character.guild.id,
                        name: row.character.guild.name,
                        rank: row.character.guild.rank,
                    }
                    : undefined,
                avatar: row.character.avatar || "/avatar-anon.png",
                last_login_timestamp: row.character.last_login_timestamp,
            },
            row.registration_source || "bnet_oauth",
            new Date(row.created_at),
            row.updated_at ? new Date(row.updated_at) : undefined,
        );
    }

    toJSON() {
        return {
            id: this.id,
            user_id: this.userId,
            wow_account_id: this.wowAccountId,
            character: this.character,
            registration_source: this.registrationSource,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt?.toISOString(),
        };
    }
}