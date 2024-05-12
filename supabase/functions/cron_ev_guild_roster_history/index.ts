import supabase from '../ev_token_generate/supabase/index.ts'

function mapMembers(data: any) {
    return data?.members.map((member: any) => {
        return {
            id: member.character.id,
            name: member.character.name,
            class: member.character.playable_class.id,
            level: member.character.level,
            rank: member.rank
        }
    })
}

async function fetchGuildRoster({
                                    token,
                                    realmId = 5826,
                                    guildId = 2239011,
                                    locale = 'en_US',
                                    namespace = 'profile-classic1x-eu'
                                }: {
    token: string,
    realmId: number,
    guildId: number,
    locale: string,
    namespace: string
}) {
    const request = await fetch(`https://eu.api.blizzard.com/data/wow/guild/${realmId}-${guildId}/roster?namespace=${namespace}&locale=${locale}`, {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })

    if (!request.ok) {
        console.error('Error fetching guild roster', request.status, request.statusText)
        return []
    }

    const data = await request.json()
    return mapMembers(data)
}


async function execute() {
    const {data, error} = await supabase.functions.invoke('everlasting-vendetta', {})
    if (error) {
        console.error('Error fetching token', error)
        throw new Error('Error fetching token')
    }

    const members = await fetchGuildRoster({
        token: data.token,
        realmId: 5826,
        guildId: 2239011,
        locale: 'en_US',
        namespace: 'profile-classic1x-eu'
    })

    const {error: insertError} = await supabase.from('ev_guild_roster_history').insert({details: members})
    if (insertError) {
        console.error('Error inserting guild roster', insertError)
        throw new Error('Error inserting guild roster')
    }
}

Deno.serve(async () => {
    await execute()

    return new Response(
        JSON.stringify({message: 'Success'}),
        {headers: {"Content-Type": "application/json"}},
    )
})
