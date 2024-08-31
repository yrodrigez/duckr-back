import type {WoWCharacter} from "./types.ts";

function mapToWoWCharacter(data: {
  id: number,
  name: string,
  realm: { slug: string, name: string, id: number },
  level: number,
  character_class: { name: string },
  last_login_timestamp: number
  guild?: { name: string, id: number, rank: number }
}): WoWCharacter {
  if (!data.id || !data.name || !data.realm || !data.realm.slug || !data.level || !data.character_class || !data.last_login_timestamp) {
    console.error(`Error when mapping data to WoWCharacter in file fetchCharacterDetails.ts: ${JSON.stringify(data)}`)
    throw new Error(`Invalid data: ${JSON.stringify(data)}`)
  }

  const className = data.character_class?.name
  if (!className) {
    console.error(`Error when mapping data to WoWCharacter in file fetchCharacterDetails.ts, character_class is undefined: ${JSON.stringify(data)}`)
    throw new Error(`Invalid data: ${JSON.stringify(data)}`)
  }

  return {
    id: data.id,
    name: data.name,
    realm: {
      name: data.realm.name,
      slug: data.realm.slug,
      id: data.realm.id
    },
    level: data.level,
    playable_class: {
      name: data.character_class.name
    },
    guild: {
      name: data.guild?.name ?? '',
      id: data.guild?.id ?? 0,
      rank: data.guild?.rank ?? 6
    },
    character_class: {
      name: data.character_class.name
    },
    last_login_timestamp: data.last_login_timestamp
  }
}

export async function fetchCharacterDetails({token, realmSlug, characterName, locale, namespace}: {
  token: string,
  realmSlug: string,
  characterName: string,
  locale: string,
  namespace: string
}): Promise<WoWCharacter> {
  const url = `https://eu.api.blizzard.com/profile/wow/character/${realmSlug}/${encodeURI(characterName.toLowerCase())}`;
  const query = new URLSearchParams({
    locale,
    namespace
  })

  const response = await fetch(`${url}?${query}`, {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });

  if (!response.ok) {
    console.error(`Error fetching character details `, response.status, response.statusText)
    throw new Error(`Error fetching character details for ${characterName} in realm ${realmSlug} response status: ${response.status}`)
  }

  const character = await response.json() as {
    id: number,
    name: string,
    realm: { slug: string, name: string, id: number },
    level: number,
    character_class: { name: string },
    last_login_timestamp: number
  };

  if (!character) {
    console.error('Character not found', characterName)
    throw new Error('Character not found')
  }

  return mapToWoWCharacter(character);
}
