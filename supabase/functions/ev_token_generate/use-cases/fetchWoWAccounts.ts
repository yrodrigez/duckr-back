import {BattleNetAccount} from "./types.ts";

const mapToBattleNetAccount = (data: any): BattleNetAccount => {
    if(!data.id || !data.wow_accounts) {
        console.error(`Error when mapping data to BattleNetAccount in file fetchWowUser.ts: ${JSON.stringify(data)}`)
        throw new Error (`Invalid data: ${JSON.stringify(data)}`)
    }

    return {
        id: data.id,
        wow_accounts: data.wow_accounts
    }
}

export async function fetchWoWAccounts({token, namespace, locale}: { token: string, namespace: string, locale: string }) {
    if (!token) {
        console.log('NO token')
        throw new Error('fetchBattleNetWoWAccounts - token parameter is required')
    }

    const query = new URLSearchParams({
        namespace,
        locale
    })

    const response = await fetch(`https://eu.api.blizzard.com/profile/user/wow?${query}`, {
        headers: {
            'Authorization': 'Bearer ' + token,
        }
    });

    if (!response.ok) {
        const text = await response.text()
        console.log('Error fetching wow accounts, verify your token', `${response.status} - ${text} ${token}`)
        throw new Error('Error fetching wow accounts, verify your token')
    }

    const data = await response.json();
    return mapToBattleNetAccount(data);
}
