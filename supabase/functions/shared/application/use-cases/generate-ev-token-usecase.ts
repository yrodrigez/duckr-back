import { WoWCharacter } from "@entities/wow/wow-character.ts";
import { IAdminRepository } from "@repositories/i-admin-repository.ts";
import { IPermissionRepository } from "@repositories/i-permission-repository.ts";
import { IRoleRepository } from "@repositories/i-role-repository.ts";
import { TokenClaims, type WowWAccountClaims } from "@entities/auth/token-claims.ts";
import { getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { getEnvironment } from "../../infrastructure/environment.ts";
import { IJwtTokenGenerator } from "@repositories/i-jwt-token-generation.ts";


export class GenerateEvTokenUsecase {
    constructor(
        private readonly adminRepository: IAdminRepository,
        private readonly permissionRepository: IPermissionRepository,
        private readonly roleRepository: IRoleRepository,
        private readonly tokenGenerator: IJwtTokenGenerator,
    ) {
    }
    async execute(
        selectedCharacter: WoWCharacter,
        blizzardToken: string,
        source: string = "bnet_oauth",
        authId: string,
    ) {
       
        const [roles, isAdmin] = await Promise.all([
            this.roleRepository.findByMemberId(selectedCharacter.id),
            this.adminRepository.isAdmin(selectedCharacter.id),
        ]);

        const permissions = await this.permissionRepository.findByRoles(roles);
        const { jwtExpiration } = getEnvironment();
        const iat = getNumericDate(new Date());
        const claims = new TokenClaims(
            "https://ijzwizzfjawlixolcuia.supabase.co/auth/v1",
            "authenticated",
            iat,
            getNumericDate(jwtExpiration),
            "authenticated",
            "aal1",
            authId,
            selectedCharacter.id,
            {
                ...selectedCharacter.toJSON() ,
                userId: authId,
                source,
                isTemporal: source === "temporal",
                isAdmin,
            } as WowWAccountClaims,
            blizzardToken,
            roles,
            permissions,
        );
        const token = await this.tokenGenerator.generate(claims);

        return {
            access_token: token,
            expires_in: jwtExpiration,
            created_at: new Date(iat * 1000),
            expiration_date: new Date((iat + jwtExpiration) * 1000).getTime(),
        };

    }
}
