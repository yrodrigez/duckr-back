function hasTokenExpired(token: any) {
	const createdAt = new Date(token.created_at);
	const expiresInSeconds = 86399;
	const expiryDate = new Date(createdAt.getTime() + expiresInSeconds * 1000);
	return Date.now() >= expiryDate.getTime();
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
	if(!accessToken || !expiresIn) {
		throw new Error('No token or expiry time provided');
	}
	const expiresAt = new Date();
	expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

	const {data, error} = await supabase
	.from('blizzard_token')
	.insert({
		token: accessToken,
		created_at: new Date().toISOString(),
		expires_at: expiresAt.toISOString()
	});

	if (error) {
		console.error('Error saving new token:', error);
		return null;
	}

	return data;
}

export async function fetchWoWProfileToken(supabase: any) {
	try {
		let tokenRecord = await getTokenFromDatabase(supabase);

		if (!tokenRecord || hasTokenExpired(tokenRecord)) {
			const newToken = await refreshToken();
			if (newToken) {
				await saveTokenToDatabase(supabase, newToken.access_token, newToken.expires_in);
				tokenRecord = newToken;
			}
		}

		return tokenRecord.access_token || tokenRecord.token;
	} catch (e) {
		return {error: true, message: e.message || 'Error fetching WoW profile token', stack: e.stack};
	}
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

	if(!response.ok) {
		const text = await response.text();
		throw new Error('Failed to fetch new token' + response.statusText + ' - ' + text);
	}

	return await response.json()
}
