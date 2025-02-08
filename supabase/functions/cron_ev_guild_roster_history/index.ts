import createSupabaseClient from "../ev_token_generate/supabase/index.ts";

import { fetchCharacterDetails } from "../ev_token_generate/use-cases/fetchCharacterDetails.ts";
import { findCharacterAvatar } from "../ev_token_generate/use-cases/fetchCharacterAvatar.ts";
import { GuildCharacter } from "../ev_token_generate/use-cases/types.ts";
import { GuildRosterResponse, SupabaseMemberResponse } from "./types.ts";
const CURRENT_REALM_SLUG = "living-flame";
const CURRENT_REALM_ID = 5827;
const CURRENT_GUILD_ID = 2410263;
const supabase = createSupabaseClient();

function getClassNumberFromName(name: string) {
    switch (name) {
        case "Warrior":
            return 1;
        case "Paladin":
            return 2;
        case "Hunter":
            return 3;
        case "Rogue":
            return 4;
        case "Priest":
            return 5;
        case "Death Knight":
            return 6;
        case "Shaman":
            return 7;
        case "Mage":
            return 8;
        case "Warlock":
            return 9;
        case "Monk":
            return 10;
        case "Druid":
            return 11;
        case "Demon Hunter":
            return 12;
        default:
            return 0;
    }
}

export function transformMembersForHistory(data: GuildCharacter[]) {
    return data?.filter((member) => member.guild?.name === "Everlasting Vendetta")
        .map((member) => {
            return {
                id: member.id,
                name: member.name,
                class: member.playable_class.name
                    ? getClassNumberFromName(member.playable_class.name)
                    : member.playable_class.id,
                level: member.level,
                rank: 6,
            };
        });
}



export async function fetchGuildRoster(
    { token }: { token: string },
): Promise<{
    character: {
        name: string;
        realm: { slug: string; id: number };
    };
}[]> {
    const { data, error } = await supabase
        .from("ev_member")
        .select("character")
        .eq("character->realm->>slug", CURRENT_REALM_SLUG)
        .gte("character->>level", 20)
        .order("updated_at", { ascending: false })
        .returns<SupabaseMemberResponse[]>();

    if (error) {
        console.error(error);
        throw new Error("Error fetching guild roster");
    }

    const guildMembers = await getBattleNetGuildMembers({
        token,
        realmId: CURRENT_REALM_ID,
        guildId: CURRENT_GUILD_ID,
        namespace: "profile-classic1x-eu",
        locale: "en_US",
    });

    const mergedUniqueMembers = new Map([
        ...guildMembers.map((member) => {
            return {
                character: {
                    name: member.character.name,
                    realm: member.character.realm,
                },
            };
        }),
        ...data.map((member) => {
            return {
                character: {
                    name: member.character.name,
                    realm: member.character.realm,
                },
            };
        }),
    ].map((member) => [member.character.name, member]));

    return Array.from(mergedUniqueMembers.values());
}

export async function getBattleNetGuildMembers(
    { realmId, guildId, token, namespace, locale }: {
        realmId: number;
        guildId: number;
        token: string;
        namespace: string;
        locale: string;
    },
): Promise<{ character: GuildCharacter }[]> {
    const request = await fetch(
        `https://eu.api.blizzard.com/data/wow/guild/${realmId}-${guildId}/roster?namespace=${namespace}&locale=${locale}`,
        {
            headers: {
                "Authorization": "Bearer " + token,
            },
        },
    );

    if (!request.ok) {
        console.error(
            "Error fetching battle.net guild members",
            request.status,
            request.statusText,
        );
        // throw new Error("Error fetching guild members");
        return []
    }

    const data = await request.json() as GuildRosterResponse;
    const members = data?.members?.map((member) => {
        return {
            character: {
                ...member.character,
                guild: data.guild,
                realm: data.guild.realm,
            },
            avatar: "/avatar-anon.png",
        };
    }) as unknown as { character: GuildCharacter }[];

    return members ?? [];
}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateMember(
    token: string,
    member: { character: { realm?: { slug: string }; name: string } },
) {
    const characterName = member.character.name.toLowerCase();
    const realmSlug = CURRENT_REALM_SLUG;
    const namespace = "profile-classic1x-eu";
    const locale = "en_US";

    const [updatedMember, avatar] = await Promise.all([
        (async () => {
            try {
                return await fetchCharacterDetails({
                    token,
                    realmSlug,
                    characterName,
                    locale,
                    namespace,
                });
            } catch (e) {
                console.error(`Error fetching character details ignoring ${characterName}`, e.message);
                return null;
            }
        })(),
        findCharacterAvatar({
            token,
            realmSlug,
            characterName,
            locale,
            namespace,
        }),
    ]);

    if (updatedMember) {
        return { ...updatedMember, avatar };
    }

    return null;
}

/*
 will update member by member if its guild has changed
* */
export async function updateRoster(
    token: string,
    currentMembers: { character: { realm?: { slug: string }; name: string } }[],
) {
    const updatedMembers: GuildCharacter[] = [];

    for (let i = 0; i < currentMembers.length; i+=3) {
        const members = currentMembers.slice(i, i+3);

        const results = await Promise.all(members.map(async member => await updateMember(token, member)));

        // Delay the next iteration by 300ms
        if (i + 3 < currentMembers.length) {
            await delay(300);
        }

        updatedMembers.push(...results.filter(Boolean) as GuildCharacter[]);
    }

    return updatedMembers;
}

async function execute() {
    const { data: tokenResponse, error: tokenError } = await supabase.functions
        .invoke("everlasting-vendetta", {});

    if (tokenError) {
        console.error("Error fetching token", tokenError);
        throw new Error("Error fetching token");
    }
    const token = tokenResponse.token;

    const members = await fetchGuildRoster({ token });
    const updatedRoster = await updateRoster(token, members);

    const { error: updateError } = await supabase
        .from("ev_member")
        .upsert(
            updatedRoster.map((member) => ({
                id: member.id,
                character: { ...member },
            })),
            { onConflict: "id" },
        );

    if (updateError) {
        console.error("Error updating guild roster ", updateError.message);
        throw new Error("Error updating guild roster " + updateError.message);
    }

    const { error: insertError } = await supabase.from("ev_guild_roster_history")
        .insert({
            details: transformMembersForHistory(updatedRoster.filter((character) => {
                return character.guild?.name === "Everlasting Vendetta";
            })),
        });
    if (insertError) {
        console.error("Error inserting guild roster", insertError);
        throw new Error("Error inserting guild roster");
    }
}

Deno.serve(async () => {
    console.log("Starting cron_ev_guild_roster_history");
    try {
        await execute();
        console.log("Success");
        return new Response(
            JSON.stringify({ message: "Success" }),
            { headers: { "Content-Type": "application/json" } },
        );
    } catch (e) {
        console.error("Unhandled error during execution", e);
        return new Response(
            JSON.stringify({ message: "Error", details: e.message }),
            { headers: { "Content-Type": "application/json" }, status: 500 },
        );
    }
});
