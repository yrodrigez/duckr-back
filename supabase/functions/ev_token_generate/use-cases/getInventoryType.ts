const slotToInvType: Record<string, string> = {
    HEAD: 'INVTYPE_HEAD',
    NECK: 'INVTYPE_NECK',
    SHOULDER: 'INVTYPE_SHOULDER',
    CHEST: 'INVTYPE_CHEST',
    ROBE: 'INVTYPE_ROBE',
    WAIST: 'INVTYPE_WAIST',
    LEGS: 'INVTYPE_LEGS',
    FEET: 'INVTYPE_FEET',
    WRIST: 'INVTYPE_WRIST',
    HAND: 'INVTYPE_HAND',
    FINGER: 'INVTYPE_FINGER',
    TRINKET: 'INVTYPE_TRINKET',
    CLOAK: 'INVTYPE_CLOAK',
    WEAPON: 'INVTYPE_WEAPON',
    SHIELD: 'INVTYPE_SHIELD',
    '2HWEAPON': 'INVTYPE_2HWEAPON',
    TWOHWEAPON: 'INVTYPE_TWOHWEAPON',
    WEAPONMAINHAND: 'INVTYPE_WEAPONMAINHAND',
    WEAPONOFFHAND: 'INVTYPE_WEAPONOFFHAND',
    HOLDABLE: 'INVTYPE_HOLDABLE',
    RANGED: 'INVTYPE_RANGED',
    THROWN: 'INVTYPE_THROWN',
    RANGEDRIGHT: 'INVTYPE_RANGEDRIGHT',
    RELIC: 'INVTYPE_RELIC',
    BODY: 'INVTYPE_BODY',
    TABARD: 'INVTYPE_TABARD',
    AMMO: 'INVTYPE_AMMO',
    BAG: 'INVTYPE_BAG'
}

/**
 * Extract the INVTYPE_* constant from a Wowhead tooltip’s raw HTML.
 * Returns `null` if it can’t be determined.
 */
export const getInventoryType = (html: string): string | null => {
    //console.log('getInventoryType', html)
    if (!html) return null

    // --- primary path: use the Web-standard DOMParser available in Deno ---
    try {
        // deno-lint-ignore no-explicit-any
        const doc = new (globalThis as any).DOMParser().parseFromString(html, 'text/html')
        const slotCell = doc?.querySelector('table table tr td')
        if (slotCell) {
            const slot = slotCell.textContent.trim().toUpperCase()
            return slotToInvType[slot] ?? null
        }
    } catch {
        /* ignore – will try regex below */
    }

    // --- fallback path: minimal regex (works even without DOMParser) ---
    const m = html.match(/<td>\s*([^<]+?)\s*<\/td>\s*<th/i)
    if (m) {
        const slot = m[1].trim().toUpperCase()
        return slotToInvType[slot] ?? null
    }

    return null
}