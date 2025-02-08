
import {
    fetchGuildRoster,
    transformMembersForHistory,
    updateRoster
} from "../functions/cron_ev_guild_roster_history/index.ts";
import createSupabaseClient from "../functions/ev_token_generate/supabase/index.ts";


Deno.test("fetches guild members successfully", async () => {
    const start = Date.now();
    const supabase = createSupabaseClient();

    const { data: tokenResponse, error: tokenError } = await supabase.functions
        .invoke("everlasting-vendetta", {});
    console.log(tokenResponse, tokenError);
    const response = await fetchGuildRoster({ token: tokenResponse.token });
    //console.log(response.map((member) => member.character.realm.slug).filter((slug) => !slug));
    //@ts-ignore
    //const members = response.filter(member=> member?.character?.level > 20);
    console.log('updating roster', response.length);
    const roster = await updateRoster(tokenResponse.token, response);
    console.log('roster updated', roster.length);

    const transformedRoster = transformMembersForHistory(roster.filter((character) => {
        return character.guild?.name === "Everlasting Vendetta";
    }))


    const { error: insertError } = await supabase.from("ev_guild_roster_history")
        .insert({
            details: transformedRoster,
        });
    if (insertError) {
        console.error("Error inserting guild roster", insertError);
        throw new Error("Error inserting guild roster");
    }

    console.log(transformedRoster);

    const end = Date.now();
    console.log(`Execution time: ${end - start}ms`);
});
