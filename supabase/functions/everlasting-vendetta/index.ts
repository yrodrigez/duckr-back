import {createClient} from "npm:@supabase/supabase-js"

const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
)

function hasTokenExpired(token: any) {
    const createdAt = new Date(token.created_at);
    const expiresInSeconds = 86399;
    const expiryDate = new Date(createdAt.getTime() + expiresInSeconds * 1000);
    return new Date() >= expiryDate;
}

async function getTokenFromDatabase(supabase: any) {
    const {data, error} = await supabase
        .from('blizzard_token')
        .select('*')
        .order('created_at', {ascending: false})
        .limit(1);

    if (error || !data || data.length === 0) {
        console.error('Error fetching token or no token found:', error);
        return null;
    }

    return data[0];
}

async function saveTokenToDatabase(supabase: any, accessToken: any, expiresIn: any) {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    const {data, error} = await supabase
        .from('blizzard_token')
        .insert({
            token: accessToken,
            created_at: new Date(),
            expires_at: expiresAt.toISOString()
        });

    if (error) {
        console.error('Error saving new token:', error);
        return null;
    }

    return data;
}

async function fetchWoWProfileToken(supabase: any) {
    let tokenRecord = await getTokenFromDatabase(supabase);

    if (!tokenRecord || hasTokenExpired(tokenRecord)) {
        const newToken = await refreshToken();
        if (newToken) {
            await saveTokenToDatabase(supabase, newToken.access_token, newToken.expires_in);
            tokenRecord = newToken;
        }
    }

    return tokenRecord.access_token || tokenRecord.token;
}

async function refreshToken() {
    const tokenUrl = 'https://oauth.battle.net/token';
    const clientId = Deno.env.get('BLIZZARD_CLIENT_ID');
    const clientSecret = Deno.env.get('BLIZZARD_CLIENT_SECRET');

    const headers = new Headers();
    headers.append('Content-Type', 'application/x-www-form-urlencoded');
    headers.append('Authorization', 'Basic ' + btoa(clientId + ':' + clientSecret));

    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'wow.profile'
    });
    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: headers,
        body: body
    })

    return await response.json()
}


Deno.serve(async () => {
    const token = await fetchWoWProfileToken(supabase)

    const data = {
        token
    }

    return new Response(
        JSON.stringify(data),
        {headers: {"Content-Type": "application/json"}},
    )
})
