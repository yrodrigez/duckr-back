import {create, getNumericDate} from "https://deno.land/x/djwt@v3.0.2/mod.ts";

export async function generateToken(payload: any, expiresIn: number = 60 * 60 * 23, JWT_EV_PRIVATE_KEY: string = Deno.env.get('JWT_EV_PRIVATE_KEY')!) {
    if (!JWT_EV_PRIVATE_KEY) {
        throw new Error('JWT_EV_PRIVATE_KEY is mandatory')
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(JWT_EV_PRIVATE_KEY),
        {name: 'HMAC', hash: 'SHA-256'},
        false,
        ['sign', 'verify']
    );

    return await create({alg: "HS256", typ: "JWT", kid: 'zUYrBkJCfcvL3mYN'}, {
        ...payload,
        exp: getNumericDate(expiresIn)
    }, key)
}
