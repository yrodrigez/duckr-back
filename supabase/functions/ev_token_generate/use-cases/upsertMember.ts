import createSupabaseClient from '../supabase/index.ts'
import type {GuildCharacter} from "./types.ts";

export async function upsertMember(character: GuildCharacter) : Promise<string>{
    const supabase = createSupabaseClient()
    const {data, error} = await supabase.from('ev_member')
        .upsert({
            id: character.id,
            character,
            updated_at: new Date()
        }).select('id, user_id')
        .single()

    if (error) {
        throw new Error('Error creating member' + JSON.stringify(error))
    }

    return data.user_id
}
