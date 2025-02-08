import {getNumericDate} from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import {generateToken} from "./use-cases/generateToken.ts";

import {fetchWoWAccounts} from "./use-cases/fetchWoWAccounts.ts";
import {fetchCharacterDetails} from "./use-cases/fetchCharacterDetails.ts";
import {upsertMember} from "./use-cases/upsertMember.ts";
import {findCharacterAvatar} from "./use-cases/fetchCharacterAvatar.ts";
import {GuildCharacter, WoWCharacter} from "./use-cases/types.ts";
import {isAdmin} from "./use-cases/isAdmin.ts";
import {fetchRoles} from "./use-cases/fetchRoles.ts";
import { fetchPermissions } from "./use-cases/fetchPermissions.ts";

let expiresIn = 60 * 60 * 23 // 24 hours
const namespace = 'profile-classic1x-eu'
const locale = 'en_US'
const allowedRealms = ['lone-wolf', 'living-flame']

async function fetchCharacterDetailsWithAvatar({token, realmSlug, characterName, locale, namespace}: { token: string, realmSlug: string, characterName: string, locale: string, namespace: string }) {

    const [characterDetails, avatar] = await Promise.all([
        fetchCharacterDetails({token, realmSlug, characterName, locale, namespace}),
        findCharacterAvatar({token, characterName, realmSlug, locale, namespace})
    ])

    if (!characterDetails) {
        throw new Error('Character not found')
    }

    return {...characterDetails, avatar} as GuildCharacter
}

async function execute(blizzardToken: string, selectedCharacter: WoWCharacter, source = "bnet_oauth") {
    let currentCharacter : WoWCharacter | undefined;
    if(source !== 'temporal') {
        const wowAccounts = await fetchWoWAccounts({token: blizzardToken, locale, namespace})
        const wowAccount = wowAccounts?.wow_accounts.find(account => account.characters.some(x => allowedRealms.includes(x.realm.slug) && x.id === selectedCharacter.id))
        if (!wowAccount) {
            throw new Error(`No wow account found in allowed realms id: ${selectedCharacter.id}, characters: ${JSON.stringify(wowAccount)}`)
        }
        const {characters,id} = wowAccount
        currentCharacter = characters.find(x => x.id === selectedCharacter.id)
        if (!currentCharacter) {
            throw new Error(`Selected character not found in the list of characters id: ${selectedCharacter.id}, characters: ${JSON.stringify(characters)}`)
        }

        try {
          await Promise.all(characters.filter(x => x.level > 19).map(async (character) => {
            const characterWithAvatar = await fetchCharacterDetailsWithAvatar({
              token: blizzardToken,
              realmSlug: character.realm.slug,
              characterName: character.name,
              locale,
              namespace
            })

            await upsertMember(characterWithAvatar, source, id)
          }))
        } catch (e) {
            // This is a non-blocking error, we don't want to block the token generation
            console.error(`Error upserting characters for account ${id}`)
            console.error(e)
        }

    } else {
        expiresIn = 60 * 60 // 1 hour
        currentCharacter = selectedCharacter
    }

    const characterWithAvatar = await fetchCharacterDetailsWithAvatar({
        token: blizzardToken,
        realmSlug: currentCharacter.realm.slug,
        characterName: currentCharacter.name,
        locale,
        namespace
    })

    const [authId, characterAdmin, customRoles] = await Promise.all([
        upsertMember(characterWithAvatar, source),
        isAdmin(characterWithAvatar.id),
        fetchRoles(characterWithAvatar.id)
    ])

    const permissions = await fetchPermissions(customRoles)
    const token = await generateToken({
        iis: 'https://ijzwizzfjawlixolcuia.supabase.co/auth/v1',
        role: 'authenticated',
        iat: getNumericDate(new Date()),
        exp: getNumericDate(expiresIn),
        aud: 'authenticated',
        aal: 'aal1',
        sub: authId,
        cid: characterWithAvatar.id,
        wow_account: {userId: authId, ...characterWithAvatar, source, isTemporal: source === 'temporal', isAdmin: characterAdmin},
        token: blizzardToken,
        custom_roles: customRoles,
        permissions
    })

    const data = {
        expires_in: expiresIn,
        created_at: new Date(),
        expiration_date: new Date(new Date().getTime() + expiresIn * 1000).getTime(),
        access_token: token
    }

    console.log(`Generated token for ${selectedCharacter.id} and token ${blizzardToken} with source ${source}`)
    return new Response(
        JSON.stringify({...data}),
        {headers: {"Content-Type": "application/json"}},
    )
}

Deno.serve(async (req: Request) => {
    const {blizzardToken, selectedCharacter, source = "bnet_oauth"}: { blizzardToken: string, selectedCharacter: WoWCharacter, source?: string } = await req.json()

    console.log(`at ${Date.now()} Generating token for ${selectedCharacter.id} and token ${blizzardToken} with source ${source}`)

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
        return await execute(blizzardToken, selectedCharacter, source)
    } catch (e) {
        console.error(`Error generating token for ${selectedCharacter.id} and token ${blizzardToken}`)
        console.error(`Selected character: ${JSON.stringify(selectedCharacter)}`)
        console.error(e.message)

        return Response.json(
            {error: e.message},
            {status: 500},
        )
    }
})

