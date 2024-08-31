
import {
    fetchGuildRoster,
    transformMembersForHistory,
    updateRoster
} from "../functions/cron_ev_guild_roster_history/index.ts";
import createSupabaseClient from "../functions/ev_token_generate/supabase/index.ts";


Deno.test("fetches guild members successfully", async () => {

    const supabase = createSupabaseClient();

    const { data: tokenResponse, error: tokenError } = await supabase.functions
        .invoke("everlasting-vendetta", {});
    console.log(tokenResponse, tokenError);
    const response = await fetchGuildRoster({ token: tokenResponse.token });
    //console.log(response.map((member) => member.character.realm.slug).filter((slug) => !slug));
    const roster = await updateRoster(tokenResponse.token, response);

    const transformedRoster = transformMembersForHistory(roster.filter((character) => {
        return character.guild?.name === "Everlasting Vendetta";
    }))

});
