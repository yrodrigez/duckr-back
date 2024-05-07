export async function findCharacterAvatar({token, characterName, realmSlug, locale, namespace}: {
    token: string,
    characterName: string,
    realmSlug: string
    locale: string,
    namespace: string
}): Promise<string> {

    const query = new URLSearchParams({
        locale,
        namespace
    })

    const encodedName = encodeURI(characterName.toLowerCase())
    const response = await fetch(`https://eu.api.blizzard.com/profile/wow/character/${realmSlug}/${encodedName}/character-media?${query}`, {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    });

    if (!response.ok) {
        console.error('Error fetching character avatar', response.status, response.statusText)
        return '/avatar-anon.png'
    }

    const data: { assets?: { key: string, value: string }[] } = await response.json()
    if (!data || !data.assets || data.assets.length === 0) {
        console.warn('No assets found for character', characterName)
        return '/avatar-anon.png'
    }

    const avatarObject = data.assets.find((asset) => asset.key === 'avatar')
    return avatarObject?.value ?? '/avatar-anon.png'
}
