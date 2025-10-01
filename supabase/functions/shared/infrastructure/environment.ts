export const getEnvironment = () => Object.freeze({
    isProd: (Deno.env.get("IS_DEV")! ?? "") !== "true",
    supabaseUrl: (Deno.env.get("IS_DEV")! ?? "") !== "true"
        ? Deno.env.get("SUPABASE_URL")!
        : Deno.env.get("DEV_SUPABASE_URL")!,
    supabaseKey: (Deno.env.get("IS_DEV")! ?? "") !== "true"
        ? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        : Deno.env.get("DEV_SUPABASE_SERVICE_ROLE_KEY")!,

    blizzardClientId: Deno.env.get("BLIZZARD_CLIENT_ID")!,
    blizzardClientSecret: Deno.env.get("BLIZZARD_CLIENT_SECRET")!,
    blizzardRegion: 'eu',
    blizzardLocale: 'en_US',
    discordClientId: Deno.env.get("DISCORD_CLIENT_ID")!,
    discordClientSecret: Deno.env.get("DISCORD_CLIENT_SECRET")!,
    discordGuildId: Deno.env.get("DISCORD_GUILD_ID")!,
	jwtSecret: Deno.env.get('JWT_EV_PRIVATE_KEY')!,
	jwtExpiration: 60 * 60 * 24, // 1 day in seconds
	jwtKid: Deno.env.get('JWT_EV_KID')! || 'zUYrBkJCfcvL3mYN',
})