import { CharacterBelongsToAccountUsecase } from "@use-cases/character-belongs-to-account-usecase.ts";
import WowAccountService from "@external/wow-account-service.ts";
import { BlizzardOauthService } from "@external/blizzard-generic-token-api-client.ts";
import { WowAccountRepository } from "../shared/infrastructure/repositories/wow-account-repository.ts";
import { DatabaseClientFactory } from "@database/database-client-factory.ts";
import { SaveWowAccountUseCase } from "@use-cases/save-wow-account-usecase.ts";
import { SyncWowAccountCharactersUsecase } from "@use-cases/sync-wow-account-characters-usecase.ts";
import { MemberRepository } from "../shared/infrastructure/repositories/member-repository.ts";
import { DomainError } from "@errors/domain-error.ts";
import { mapDomainError, mapUnknownError } from "../shared/utils/map-error.ts";
import GetFullCharactersUsecase from "@use-cases/get-full-characters-usecase.ts";
import { WowCharacterService } from "@external/wow-character-service.ts";
import { JwtTokenGenerator } from "../shared/infrastructure/security/jwt-token-generator.ts";
import { GenerateEvTokenUsecase } from "@use-cases/generate-ev-token-usecase.ts";
import { AdminRepository } from "../shared/infrastructure/repositories/admin-repository.ts";
import { PermissionRepository } from "../shared/infrastructure/repositories/permission-repository.ts";
import { RoleRepository } from "../shared/infrastructure/repositories/role-repository.ts";

Deno.serve(async (req: Request) => {
	if (req.method !== 'POST') {
		return new Response(
			JSON.stringify({ error: 'Method Not Allowed' }),
			{ status: 405, headers: { "Content-Type": "application/json" } },
		);
	}

	const source = "bnet_oauth";
	const { blizzardToken, selectedCharacter } = await req.json()

	if (!blizzardToken) {
		return new Response(
			JSON.stringify({ error: true, message: 'Bad Request: Missing blizzardToken' }),
			{ status: 400, headers: { "Content-Type": "application/json" } },
		);
	}

	if (!selectedCharacter) {
		return new Response(
			JSON.stringify({ error: true, message: 'Bad Request: Missing selectedCharacter' }),
			{ status: 400, headers: { "Content-Type": "application/json" } },
		);
	}

	if (!selectedCharacter.id || !selectedCharacter.name || !selectedCharacter.realm?.slug || !selectedCharacter.selectedRole) {
		return new Response(
			JSON.stringify({ message: 'Bad Request: selectedCharacter must include id, name, realm.slug, and selectedRole', error: true }),
			{ status: 400, headers: { "Content-Type": "application/json" } },
		);
	}

	try {
		const blizzardOauthService = new BlizzardOauthService();
		const databaseClient = DatabaseClientFactory.getInstance();
		const wowAccountRepository = new WowAccountRepository(databaseClient);

		const saveWowAccountUseCase = new SaveWowAccountUseCase(wowAccountRepository, blizzardOauthService);
		const accountId = await saveWowAccountUseCase.execute(blizzardToken);

		const wowAccountService = new WowAccountService(blizzardToken);
		const characterBelongsUseCase = new CharacterBelongsToAccountUsecase(wowAccountService)
		const { belongs, characters } = await characterBelongsUseCase.execute(selectedCharacter.id, selectedCharacter.name, selectedCharacter.realm.slug);
		if (!belongs) {
			return new Response(
				JSON.stringify({ error: "Character does not belong to the authenticated account" }),
				{ status: 403, headers: { "Content-Type": "application/json" } },
			);
		}
		const getFullCharactersUsecase = new GetFullCharactersUsecase(new WowCharacterService(blizzardToken));
		const fullCharacters = await getFullCharactersUsecase.execute(characters.map(c => ({ ...c, name: c.name, realmSlug: c.realm.slug })));
		const memberRepository = new MemberRepository(databaseClient);
		const syncCharacters = new SyncWowAccountCharactersUsecase(memberRepository);
		await syncCharacters.execute(fullCharacters.map(c => {
			if (c.id === selectedCharacter.id) {
				console.log(`Setting selected role ${selectedCharacter.selectedRole} for character ${c.name}`);
				c.selectedRole = selectedCharacter.selectedRole;
			}
			return c;
		}), accountId, source);

		const actualCharacter = fullCharacters.find(c => c.id === selectedCharacter.id);
		if (!actualCharacter) {
			return new Response(
				JSON.stringify({ error: true, message: 'Character not found after sync' }),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		const generateTokenUseCase = new GenerateEvTokenUsecase(
			new AdminRepository(databaseClient),
			new PermissionRepository(databaseClient),
			new RoleRepository(databaseClient),
			new JwtTokenGenerator(),
		);

		const member = await memberRepository.findById(actualCharacter.id);
		
		const tokenInfo = await generateTokenUseCase.execute(actualCharacter, blizzardToken, source, member?.userId || '');

		return new Response(
			JSON.stringify(tokenInfo),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	} catch (e: unknown) {
		if (e instanceof DomainError) {
			return mapDomainError(e);
		}
		return mapUnknownError(e);
	}
});
