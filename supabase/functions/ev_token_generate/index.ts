import {create, getNumericDate} from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import {createClient} from "npm:@supabase/supabase-js"

const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
)
const JWT_EV_PRIVATE_KEY = Deno.env.get('JWT_EV_PRIVATE_KEY')!.replace(/\\n/g, '\n');
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

function base64ToArrayBuffer(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

const expiresIn = 60 * 60 * 24;

async function generateToken(payload: TokenPayload) {
    const key = await crypto.subtle.importKey(
        "pkcs8",
        base64ToArrayBuffer(JWT_EV_PRIVATE_KEY),
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: {name: "SHA-256"},
        },
        false,
        ["sign"]
    );

    return create({alg: "RS256", typ: "JWT"}, {...payload, exp: getNumericDate(expiresIn)}, key);
}

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

async function getCharacterIfInGuild(token: string, characterName: string, realmSlug: string) {
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

    if (!character.guild) {
        return null
    }

    if (character.guild.name !== guild) {
        return null
    }

    return character
}

async function fetchBattleNetWoWAccounts(token: string): Promise<TokenPayload> {
    if (!token) {
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

    const charactersWithDetails: GuildCharacter[] = (await Promise.all(characters.map(async character => {
        const guildCharacter = await getCharacterIfInGuild(token, character.name, character.realm.slug)
        if (guildCharacter) {
            return guildCharacter
        }
        return null
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

    const charactersWithAvatar = await Promise.all(charactersWithDetails.map(async character => {
        if (character) {
            //@ts-ignore - character is not null
            character.avatar = await findCharacterAvatar(token, character.name, character.realm) || null
        }
        return character
    }))

    const characterWithRole = await Promise.all(charactersWithAvatar.map(async character => {
        if (character) {
            try {
                character.role = await findMemberRole(character)
            } catch (e) {
                console.error('Error fetching member role', e)
                character.role = null
            }
        }
        return character

    }))

    // @ts-ignore - wowAccount is not null
    return {
        characters: characterWithRole,
        id: data.id,
        wowAccountId: wowAccount.id
    }
}

async function findMemberRole(character: GuildCharacter) {
    const {
        data: memberData,
        error: memberError
    } = await supabase.from('ev_member').select('id').eq('id', character.id)

    if (memberError) {
        throw new Error('Error fetching member' + JSON.stringify(memberError))
    }

    if (!memberData || memberData.length === 0) {

        await supabase.from('ev_member').insert({id: character.id, character})
        await supabase.from('ev_member_role').insert({
            member_id: character.id,
            role_id: '11b77458-6122-4059-8325-05e64fd3b987'
        })
    }

    const {
        data: roleData,
        error: roleError
    } = await supabase.from('ev_member_role').select('role:ev_role(name, id)').eq('member_id', character.id).single()
    if (roleError) {
        throw new Error('Error fetching member role' + JSON.stringify(roleError) + 'for character ' + JSON.stringify(character))
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
        name: roleData.role.name,
        permissions: (permissionsData || []).map((x: { permission: string }) => x.permission)
    }
}

async function execute(blizzardToken: string) {
    const account: TokenPayload = await fetchBattleNetWoWAccounts(blizzardToken)
    const token = await generateToken(account)
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
    const {blizzardToken}: { blizzardToken: string } = await req.json()
    if (!blizzardToken) {
        return new Response(
            JSON.stringify({error: 'blizzardToken is mandatory'}),
            {status: 400, headers: {"Content-Type": "application/json"}},
        )
    }
    try {
        return await execute(blizzardToken)
    } catch (e) {
        return new Response(
            JSON.stringify({error: e.message}),
            {status: 500, headers: {"Content-Type": "application/json"}},
        )
    }
})

