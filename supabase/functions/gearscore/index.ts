import createSupabaseClient from "../ev_token_generate/supabase/index.ts";
import {fetchWoWProfileToken} from "../utils/token.ts";
import {fetchEquipment, getItem} from "../utils/bnetAPI.ts";
import pLimit from "npm:p-limit";
import {calculateTotalGearScore, getColorForGearScoreText, isEnchantable} from "../utils/ilvl.ts";

const limit = pLimit(8);
const quality = {
	'POOR': 0,
	'COMMON': 1,
	'UNCOMMON': 2,
	'RARE': 3,
	'EPIC': 4,
	'LEGENDARY': 5,
}

const supabase = createSupabaseClient();
async function createMd5(items_raw: {
	id: number;
	type: string;
	isEnchanted: boolean;
}[]) {
	const str = JSON.stringify(items_raw);
	const data = new TextEncoder().encode(str);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);

	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getCachedGs(md5: string) {
	const {data, error} = await supabase.from("gs_cache").select("gs, color").eq("md5", md5).maybeSingle();
	if (error) {
		console.error("Error fetching gearscore", error);
		return null;
	}

	if(!data) {
		return null;
	}

	return {
		gs: data.gs,
		color: data.color,
	}
}


const execute = async (req: Request) => {

	const force = req.url.includes('force=true');

	const body = await req.json();
	if(!body || (!body.characterName && !Array.isArray(body))) {
		return new Response(
			JSON.stringify({error: "Invalid request"}),
			{
				headers: {"Content-Type": "application/json"},
				status: 400
			});
	}
	let names:string[] = [];
	if(Array.isArray(body)) {
		names = body.map((x) => x.toLowerCase()).filter(Boolean);
	} else {
		names = [body.characterName.toLowerCase()];
	}

	const token = await fetchWoWProfileToken(supabase);


	const equipments = await Promise.all(names.map((name) => limit(() => fetchEquipment(name, token))));
	return await Promise.all(equipments.map(async (equipment) => {
		const items = (equipment?.equipped_items?.map((item: any) => ({
			id: parseInt(item?.item?.id ?? 0, 10),
			type: `INVTYPE_${item.inventory_type?.type}`,
			isEnchanted: item.enchantments?.filter((e: any) => e.enchantment_slot?.type === 'PERMANENT').length > 0,
		})) ?? []);
		const isFullEnchanted = items.filter(({type}: {type: string}) => isEnchantable(type)).filter(({type}: {type: string}) => type.indexOf('RANGED') === -1).reduce((acc: boolean, item: {isEnchanted: boolean}) => acc && item.isEnchanted, true)

		const md5 = await createMd5(items.sort((a: { id: number }, b: { id: number }) => a.id - b.id));
		const cachedGs = await getCachedGs(md5);

		if (!cachedGs || force || cachedGs?.gs === 0) {
			const completeItems = await Promise.all(items.map(async (item: any) => limit(async () => {
				const details = await getItem(supabase, token, item.id, force);
				return {
					...item,
					...details,
					ilvl: details.itemDetails.level,
					// @ts-ignore - quality is always uppercase
					rarity: quality[details?.itemDetails?.quality?.type?.toUpperCase()] ?? 0,
				}
			})));

			const gs = calculateTotalGearScore(completeItems.filter((item: any) => !!item && item.ilvl > 0 && item.type?.indexOf('INVTYPE_') !== -1));
			const color = getColorForGearScoreText(gs);
			const {error} = await supabase.from('gs_cache').upsert({md5, gs, color});
			if (error) {
				console.error('Error saving gear score to cache:', error)
			}
			return {
				characterName: equipment.characterName,
				hash: md5,
				gs: gs,
				color: color,
				isFullEnchanted,
			}
		}

		return {
			characterName: equipment.characterName,
			hash: md5,
			...cachedGs,
			isFullEnchanted,
		}
	}))
}


Deno.serve(async (req) => {
	try {
		const res = await execute(req);
		return new Response(
			JSON.stringify(res),
			{ headers: { "Content-Type": "application/json" } },
		);
	} catch (e) {
		return new Response(
			JSON.stringify({error: e.message, stack: e.stack}),
			{ headers: { "Content-Type": "application/json" }, status: 500 },
		);
	}
});
