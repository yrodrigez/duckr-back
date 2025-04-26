import createSupabaseClient from '../supabase/index.ts'
import type {GuildCharacter} from "./types.ts";

export async function upsertMember(character: GuildCharacter, source: string, wow_account_id: number = 0) : Promise<string>{
    const supabase = createSupabaseClient()

    const {data: member, error: memberError} = await supabase
        .from('ev_member')
        .select('id, user_id, registration_source')
        .eq('id', character.id)
        .limit(1)
        .returns<{id: string, user_id: string, registration_source: string}[]>();

    if (memberError) {
        throw new Error('Error fetching member' + JSON.stringify(memberError))
    }
    const currentMember = member?.[0]
    const currentSource = currentMember?.registration_source
    if (member && member.length > 0 && source === 'temporal') {
        if (currentSource?.toLowerCase().indexOf('oauth') !== -1) {
            throw new Error(`Character ${character.id} already exists with a different source: ${currentSource}`)
        }
    }

    const upsertPayload = {
        id: character.id,
        character,
        updated_at: new Date(),
        registration_source: source,
    } as { id: number, character: GuildCharacter, updated_at: Date, registration_source: string, wow_account_id?: number }

    if(wow_account_id) {
        await supabase.from('wow_account')
            .upsert({
                id: wow_account_id,
            }).select('id')
            .single()

        upsertPayload['wow_account_id'] = wow_account_id
    }

    const {data, error} = await supabase.from('ev_member')
        .upsert(upsertPayload).select('id, user_id')
        .single()


    if (error) {
        throw new Error('Error creating member' + JSON.stringify(error))
    }

    return data.user_id
}
