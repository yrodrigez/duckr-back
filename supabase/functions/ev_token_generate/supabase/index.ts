import { createClient } from "npm:@supabase/supabase-js@2.47.10";
const isProd = (Deno.env.get("IS_DEV")! ?? "") !== "true";
const supabaseUrl = isProd
    ? Deno.env.get("SUPABASE_URL")!
    : Deno.env.get("DEV_SUPABASE_URL")!;
const supabaseServiceRoleKey = isProd
    ? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    : Deno.env.get("DEV_SUPABASE_SERVICE_ROLE_KEY")!;

export default function () {

  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
  );
}
