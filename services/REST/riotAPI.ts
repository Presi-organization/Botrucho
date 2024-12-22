const API_BASE_URL = "https://americas.api.riotgames.com";
const TFT_BASE_URL = "https://la1.api.riotgames.com";
const myHeaders = new Headers({
    "Content-Type": "application/json",
    "X-Riot-Token": process.env.RIOT_TOKEN as string
});

interface LeagueEntryDTO {
    puuid: string;
    queueType: string;
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    hotStreak: boolean;
    freshBlood: boolean;
    inactive: boolean;
}

const getEntriesBySummoner = async (username: string): Promise<LeagueEntryDTO[]> => {
    const [gameName, tagLine] = username.split("#").map((part) => part.trim());
    if (!gameName || !tagLine) {
        throw new Error("Invalid username format. Expected format: 'USER#TAG'");
    }
    const { id: summonerId } = await getSummonerInfoByPuuID({ gameName, tagLine });
    return makeRequest<LeagueEntryDTO[]>(`${ TFT_BASE_URL }/tft/league/v1/entries/by-summoner/${ summonerId }`, "GET");
};

const makeRequest = async <T>(endpoint: string, method: string, body?: any): Promise<T> => {
    const request = new Request(`${ endpoint }`, {
        method,
        headers: myHeaders,
        body: JSON.stringify(body),
    });
    const response = await fetch(request);
    if (!response.ok) {
        throw new Error(`Request failed with status ${ response.status }`);
    }
    return response.json();
};

const getEncryptedUserByID = async ({ gameName, tagLine }: { gameName: string; tagLine: string }): Promise<string> => {
    const { puuid: encryptedUser } = await makeRequest<{
        puuid: string
    }>(`${ API_BASE_URL }/riot/account/v1/accounts/by-riot-id/${ gameName }/${ tagLine }`, "GET");
    return encryptedUser;
};

const getSummonerInfoByPuuID = async ({ gameName, tagLine }: { gameName: string; tagLine: string }): Promise<{
    id: string
}> => {
    const puuid = await getEncryptedUserByID({ gameName, tagLine });
    return makeRequest<{ id: string }>(`${ TFT_BASE_URL }/tft/summoner/v1/summoners/by-puuid/${ puuid }`, "GET");
};

export default { getEntriesBySummoner };
