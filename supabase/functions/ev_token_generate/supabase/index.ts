const isDev =  (Deno.env.get('IS_DEV')! ?? '') === 'true'
import {createClient} from "npm:@supabase/supabase-js"

const supabaseUrl = isDev ? Deno.env.get("DEV_SUPABASE_URL")! : Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = isDev ? Deno.env.get("DEV_SUPABASE_SERVICE_ROLE_KEY")! : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

export default createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
)
