import { WoWCharacter } from "../wow/wow-character.ts";

export type WowWAccountClaims = WoWCharacter & {
    userId: string;
    source: string;
    isTemporal: boolean;
    isAdmin: boolean;
};

export class TokenClaims {
    constructor(
        public readonly iis: string =
            "https://ijzwizzfjawlixolcuia.supabase.co/auth/v1",
        public readonly role: string = "authenticated",
        public readonly iat: number,
        public readonly exp: number,
        public readonly aud: string = "authenticated",
        public readonly aal: string = "aal1",
        public readonly sub: string,
        public readonly cid: number,
        public readonly wow_account: WowWAccountClaims,
        public readonly token: string,
        public readonly custom_roles: string[] = [],
        public readonly permissions: string[] = [],
    ) {}
}
