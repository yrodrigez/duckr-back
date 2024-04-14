// deno-lint-ignore-file no-explicit-any
import {getNumericDate} from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import {createClient} from "npm:@supabase/supabase-js"
import {generateToken} from "./use-cases/generateToken.ts";

const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
)

const expiresIn = 60 * 60 * 24 * 7

type WoWCharacter = {
    name: string,
    id: number
    realm: {
        name: string
        slug: string
        id: number
    },
    level: number
}

type WoWAccount = {
    id: number,
    characters: WoWCharacter[]
}

type BattleNetAccount = {
    id: number
    wow_accounts: WoWAccount[]
}
type GuildCharacter = {
    userId: any;
    name: string,
    id: number,
    realm: string,
    level: number,
    guild: {
        name: string,
        id: number
    },
    avatar: string | null | undefined,
    role: {
        name: string,
        permissions: string[]
    } | null

}

type TokenPayload = {
    id: number,
    wowAccountId: number
    characters: {
        userId: string;
        name: string,
        id: number,
        realm: string,
        level: number,
        guild: {
            name: string,
            id: number
        },
        avatar: string | null | undefined,
        role: {
            name: string,
            permissions: string[]
        } | null
    }[]

    blizzardToken: string
}

const namespace = 'profile-classic1x-eu'
const locale = 'en_US'

const allowedRealms = ['lone-wolf']
const guild = 'Everlasting Vendetta'


async function findCharacterAvatar(token: string, characterName: string, realmSlug: string): Promise<string | null | undefined> {
    const url = `https://eu.api.blizzard.com/profile/wow/character/${realmSlug}/${characterName.toLowerCase()}/character-media`
    const query = new URLSearchParams({
        locale,
        namespace
    })
    const response = await fetch(`${url}?${query}`, {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    });

    if (!response.ok) {
        return null
    }

    const data: { assets?: { key: string, value: string }[] } = await response.json()
    if (!data || !data.assets || data.assets.length === 0) {
        return null
    }

    const avatarObject = data.assets.find((asset) => asset.key === 'avatar')
    return avatarObject?.value
}

async function getCharacterDetails(token: string, characterName: string, realmSlug: string) {
    const url = `https://eu.api.blizzard.com/profile/wow/character/${realmSlug}/${characterName.toLowerCase()}`;
    const query = new URLSearchParams({
        locale,
        namespace
    })
    const response = await fetch(`${url}?${query}`, {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    });

    if (!response.ok) {
        return null
    }

    const character = await response.json();

    if (!character) {
        return null
    }

    return character
}

async function fetchBattleNetWoWAccounts(token: string) {
    if (!token) {
        console.log('NO token')
        throw new Error('fetchBattleNetWoWAccounts - token parameter is required')
    }

    const url = 'https://eu.api.blizzard.com/profile/user/wow'
    const query = new URLSearchParams({
        namespace,
        locale
    })

    const response = await fetch(`${url}?${query}`, {
        headers: {
            'Authorization': 'Bearer ' + token,
        }
    });

    if (!response.ok) {
        const text = await response.text()
        console.log('Error fetching wow accounts, verify your token', `${response.status} - ${text}`)
        throw new Error('Error fetching wow accounts, verify your token')
    }
    const data: BattleNetAccount = await response.json();

    const wowAccount = data?.wow_accounts.find(account => account.characters.some(x => allowedRealms.includes(x.realm.slug)))
    if (!wowAccount) {
        throw new Error('No wow account found in allowed realms')
    }

    const characters = wowAccount?.characters?.filter(x => allowedRealms.includes(x.realm.slug))
    if (!characters) {
        throw new Error('No characters found in allowed realms')
    }

    //@ts-ignore - wowAccount is not null
    const charactersWithDetails: GuildCharacter[] = (await Promise.all(characters.map(async character => {
        const guildCharacter = await getCharacterDetails(token, character.name, character.realm.slug)
        return guildCharacter ?? null
    }))).filter(x => x)
        .map((character: any) => ({
            name: character.name,
            id: character.id,
            realm: character.realm.slug,
            level: character.level,
            guild: {
                name: character.guild.name,
                id: character.guild.id
            },
            avatar: null,
            role: null
        }))

    return charactersWithDetails
}

async function selectOrCreateMember(character: GuildCharacter) {

    const {
        data: memberData,
        error: memberError
    } = await supabase.from('ev_member')
        .select('id, user_id')
        .limit(1)
        .eq('id', character.id)
        .single()

    if (memberData?.user_id) {
        return memberData.user_id
    }

    const {data: created, error: createdError} = await supabase.from('ev_member')
        .insert({
            id: character.id,
            character
        }).select('id')
        .select('user_id')
        .single()

    if (createdError) {
        throw new Error('Error creating member' + JSON.stringify(createdError))
    }

    return created.user_id
}

async function findMemberWithRole(character: GuildCharacter) {
    const userId = await selectOrCreateMember(character)

    const {
        data: roleData,
        error: roleError
    } = await supabase.from('ev_member_role').select('role:ev_role(name, id)').eq('member_id', character.id)
    if (roleError) {
        throw new Error('Error fetching member role' + JSON.stringify(roleError) + 'for character ' + JSON.stringify(character))
    }

    const role = (roleData || [])[0]
    if(!role) {
        return {
            name: null,
            userId,
            permissions: []
        }
    }

    const {
        data: permissionsData,
        error: permissionsError
        //@ts-ignore - roleData.role is not null
    } = await supabase.from('ev_role_permissions').select('permission').eq('role_id', roleData.role.id)

    if (permissionsError) {
        throw new Error('Error fetching member permissions' + JSON.stringify(permissionsError))
    }

    return {
        //@ts-ignore - roleData.role is not null
        name: (roleData ?? [])[0]?.role?.name,
        userId,
        permissions: (permissionsData || []).map((x: { permission: string }) => x.permission)
    }
}


async function execute(blizzardToken: string, selectedCharacter: any) {

    const characters = await fetchBattleNetWoWAccounts(blizzardToken)
    const currentCharacter = characters.find(x => x.id === selectedCharacter.id)
    if (!currentCharacter) {
        throw new Error('Selected character not found in the list of characters')
    }

    // @ts-ignore - currentCharacter is not null
    const avatar = await findCharacterAvatar(blizzardToken, currentCharacter?.name, currentCharacter?.realm)

    const characterWithAvatar = {...currentCharacter, avatar}
    // @ts-ignore - characterWithAvatar is not null
    const characterWithRole = await findMemberWithRole(characterWithAvatar)

    const authId = characterWithRole.userId

    const token = await generateToken({
        iis: 'https://ijzwizzfjawlixolcuia.supabase.co/auth/v1',
        role: 'authenticated',
        iat: getNumericDate(new Date()),
        exp: getNumericDate(expiresIn),
        aud: 'authenticated',
        aal: 'aal1',
        sub: authId,
        cid: selectedCharacter.id,
        wow_account: {...characterWithRole, ...characterWithAvatar},
    })

    const data = {
        expires_in: expiresIn,
        created_at: new Date(),
        expiration_date: new Date(new Date().getTime() + expiresIn * 1000).getTime(),
        access_token: token
    }

    return new Response(
        JSON.stringify({...data}),
        {headers: {"Content-Type": "application/json"}},
    )
}

Deno.serve(async (req) => {
    const {blizzardToken, selectedCharacter}: { blizzardToken: string, selectedCharacter: any } = await req.json()

    if (!blizzardToken) {
        return new Response(
            JSON.stringify({error: 'blizzardToken is mandatory'}),
            {status: 400, headers: {"Content-Type": "application/json"}},
        )
    }

    if (!selectedCharacter) {
        return new Response(
            JSON.stringify({error: 'selectedCharacter is mandatory'}),
            {status: 400, headers: {"Content-Type": "application/json"}},
        )
    }
    try {
        return await execute(blizzardToken, selectedCharacter)
    } catch (e) {
        console.error(e)
        return new Response(
            JSON.stringify({error: e.message}),
            {status: 500, headers: {"Content-Type": "application/json"}},
        )
    }
})

