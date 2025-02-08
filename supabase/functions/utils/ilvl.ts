type Item = {
	ilvl: number
	type: string
	rarity: number
	isEnchanted: boolean
}

export const itemTypeInfo: { [key: string]: [number, boolean] } = {
	"INVTYPE_HEAD": [1.0000, true],
	"INVTYPE_NECK": [0.5625, false],
	"INVTYPE_SHOULDER": [0.7500, true],
	"INVTYPE_CHEST": [1.0000, true],
	"INVTYPE_ROBE": [1.0000, true],
	"INVTYPE_WAIST": [0.7500, false],
	"INVTYPE_LEGS": [1.0000, true],
	"INVTYPE_FEET": [0.75, true],
	"INVTYPE_WRIST": [0.5625, true],
	"INVTYPE_HAND": [0.7500, true],
	"INVTYPE_FINGER": [0.5625, false],
	"INVTYPE_TRINKET": [0.5625, false],
	"INVTYPE_CLOAK": [0.5625, true],
	"INVTYPE_WEAPON": [1.0000, true],
	"INVTYPE_SHIELD": [1.0000, true],
	"INVTYPE_2HWEAPON": [2.000, true],
	"INVTYPE_TWOHWEAPON": [2.000, true],
	"INVTYPE_WEAPONMAINHAND": [1.0000, true],
	"INVTYPE_WEAPONOFFHAND": [1.0000, true],
	"INVTYPE_HOLDABLE": [1.0000, false],
	"INVTYPE_RANGED": [0.3164, true],
	"INVTYPE_THROWN": [0.3164, false],
	"INVTYPE_RANGEDRIGHT": [0.3164, true],
	"INVTYPE_RELIC": [0.3164, false],
	"INVTYPE_BODY": [0, false],
	"INVTYPE_TABARD": [0, false],
	"INVTYPE_AMMO": [0, false],
	"INVTYPE_BAG": [0, false],
}

export function isEnchantable(itemType: string): boolean {
	return itemTypeInfo[itemType]?.[1] || false
}


const rarityModifiers: { [key: number]: number } = {
	0: 3.5,  // Poor
	1: 3,    // Common
	2: 2.5,  // Uncommon
	3: 1.76, // Rare
	4: 1.6,  // Epic
	5: 1.4,  // Legendary
}


const GLOBAL_SCALE = 1.7
const ENCHANTMENT_MODIFIER = 1.05
const MAX_GEAR_SCORE = 1000


function calculateItemScore(item: Item): number {
	const typeInfo = itemTypeInfo[item.type]
	let [slotModifier, isEnchantable] = typeInfo || [1, false]

	let rarityModifier = rarityModifiers[item.rarity] || 1

	let enchantModifier = (isEnchantable && item.isEnchanted)
		? ENCHANTMENT_MODIFIER
		: 1

	let adjustedItemLevel = item.ilvl

	if (item.type === "INVTYPE_2HWEAPON" || item.type === "INVTYPE_TWOHWEAPON") {
		//adjustedItemLevel = (item.ilvl * 1.0625) * 2
	}


	return (
		(adjustedItemLevel / rarityModifier) *
		slotModifier *
		enchantModifier *
		GLOBAL_SCALE
	)
}

export function getColorForGearScoreText(gearScore: number): string {
	const percentile = (gearScore / MAX_GEAR_SCORE) * 100

	if (percentile >= 100) {
		return "relic";
	} else if (percentile >= 99) {
		return "pink";
	} else if (percentile >= 95) {
		return "legendary";
	} else if (percentile >= 75) {
		return "epic";
	} else if (percentile >= 50) {
		return "rare";
	} else if (percentile >= 25) {
		return "uncommon";
	} else {
		return "common";
	}
}

export function calculateTotalGearScore(items: Item[]): number {
	const totalScore = items.reduce((sum, item) => sum + calculateItemScore(item), 0)
	return Math.floor(totalScore + 0.5)
}
