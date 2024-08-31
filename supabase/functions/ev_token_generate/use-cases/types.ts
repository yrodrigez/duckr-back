export type WoWCharacter = {
    name: string,
    id: number
    realm: {
        name: string
        slug: string
        id: number
    },
    level: number
    last_login_timestamp: number
    character_class: {
        name: string
    },
    playable_class: {
        name?: string
        id?: string
    },
    guild?: {
        name: string,
        id: number
        rank: number
    },
}

export type WoWAccount = {
    id: number,
    characters: WoWCharacter[]
}

export type BattleNetAccount = {
    id: number
    wow_accounts: WoWAccount[]
}

export type GuildCharacter = {
    avatar: string,
} & WoWCharacter

