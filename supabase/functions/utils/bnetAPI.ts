import {
	BLIZZARD_API_LOCALE,
	BLIZZARD_API_PROFILE_NAMESPACE,
	BLIZZARD_API_STATIC_NAMESPACE,
	REALM_SLUG
} from "./constants.ts";
import {type SupabaseClient} from "npm:@supabase/supabase-js@2.47.10";
import axios from "npm:axios@1.6.7";

export async function fetchEquipment(characterName: string, token: string)  {
	if (!characterName) {
		throw new Error('WoWService::fetchEquipment - characterName parameter is required')
	}

	const url = `https://eu.api.blizzard.com/profile/wow/character/${REALM_SLUG}/${encodeURIComponent(characterName)}/equipment`
	const query = new URLSearchParams({
		locale: BLIZZARD_API_LOCALE,
		namespace: BLIZZARD_API_PROFILE_NAMESPACE
	})

	const response = await fetch(`${url}?${query}`, {
		headers: {
			'Authorization': 'Bearer ' + token
		}
	})

	if(!response.ok) {
		const text = await response.text()
		throw new Error('WoWService::fetchEquipment - Error fetching equipment: ' + text)
	}

	const data = await response.json()
	return {
		...data,
		characterName
	}
}


function knownItemLevelQuality(itemId: number) {
	const knownItemLevels = {
		215161: 45,
		210781: 30,
		211450: 33,
		215111: 45,
		999999: 0,
		0: 0,
		216494: 45,
		213409: 45,
		213350: 45,

	} as any
	return knownItemLevels[itemId] ?? 0;

}

async function fetchItemDetails(token: string, itemId: number) {
	if (!token) {
		console.error('No token provided for fetching item details')
		throw new Error('No token provided for fetching item details')
	}
	const url = `https://eu.api.blizzard.com/data/wow/item/${itemId}?namespace=${BLIZZARD_API_STATIC_NAMESPACE}&locale=${BLIZZARD_API_LOCALE}` //createBlizzardItemFetchUrl(itemId);
	let itemDetails = {quality: {}, level: knownItemLevelQuality(itemId)} as any;

	try {
		const {data} = await axios.get(`${url}`, {
			headers: {'Authorization': 'Bearer ' + token}
		})

		itemDetails = data;
	} catch (e) {
		console.error('Error fetching item details:', itemId, e)
		console.error('try this in postman', url, 'with token', token)
		return itemDetails
	}
	if (itemDetails.quality.level === 0) {
		console.error('Item quality not found for item:', itemId)
	}
	return itemDetails;
}

async function fetchWoWHeadItem(itemId: number) {
	const url = `https://nether.wowhead.com/tooltip/item/${itemId}?dataEnv=4&locale=0`
	const response = await fetch(url)
	const data = await response.json() as {
		icon: string,
		quality: number,
		name: string,
		id: number,
		tooltip: string
		spells: any[]
	}

	const qualityName = [
		'poor',
		'common',
		'uncommon',
		'rare',
		'epic',
		'legendary',
		'artifact',
		'heirloom',
	][data.quality ?? 0]

	return {
		icon: `https://wow.zamimg.com/images/wow/icons/medium/${data.icon}.jpg`,
		quality: data.quality,
		qualityName: qualityName,
		name: data.name,
		id: data.id,
		tooltip: data.tooltip,
		spells: data.spells
	}
}

async function getItemFromDatabase(supabase: SupabaseClient, itemId: number) {
	const {data, error} = await supabase.from('wow_items')
	.select('*')
	.eq('id', itemId)
	.limit(1)
	.single()

	if (error) {
		console.error('Error fetching item from database:', error)
		return null
	}

	if (!data?.details) {
		return null
	}

	return {details: data.details, lastUpdated: data.updated_at, displayId: data.displayId, id: data.id}
}

async function saveItemToDatabase(supabase: SupabaseClient, itemId: number, itemDetails: any) {
	const {data, error} = await supabase.from('wow_items')
	.upsert({id: itemId, details: itemDetails, display_id: 0, updated_at: new Date()}).select('details')
	.limit(1)
	.single()
	if (error) {
		console.error('Error saving item to database:', error)
		return null
	}

	return data
}

async function fetchNewItem(supabase: SupabaseClient, token: string, itemId: number) {
	const [wowHeadItem, bnetDetails, ] = await Promise.all([
		fetchWoWHeadItem(itemId),
		fetchItemDetails(token, itemId),
	])

	const itemDetails = {
		...wowHeadItem,
		...bnetDetails,
		icon: wowHeadItem.icon,
	}

	saveItemToDatabase(supabase, itemId, itemDetails).then() // Don't wait for this to finish
	const itemIconUrl = itemDetails.icon
	return ({itemIconUrl, itemDetails})
}

export async function getItem(supabase: SupabaseClient, token: string, itemId: number, force: boolean = false) {
	if (force) {
		return fetchNewItem(supabase, token, itemId)
	}
	const itemFromDatabase = await getItemFromDatabase(supabase, itemId)
	const lastUpdated = itemFromDatabase?.lastUpdated
	const updatedLessThan3WeeksAgo = ((new Date().getTime() - new Date(lastUpdated).getTime()) < 1000 * 60 * 60 * 24 * 21)

	if(itemFromDatabase && updatedLessThan3WeeksAgo) {
		const itemIconUrl = itemFromDatabase.details.icon
		return ({itemIconUrl, itemDetails: itemFromDatabase.details})
	}

	return fetchNewItem(supabase, token, itemId)
}
