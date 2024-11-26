const API_BASE_URL = "https://americas.api.riotgames.com";
const TFT_BASE_URL = "https://la1.api.riotgames.com";
const myHeaders = new Headers({
    "Content-Type": "application/json",
    "X-Riot-Token": process.env.RIOT_TOKEN
});

/**
 * @typedef {Object} LeagueEntryDTO
 * @property {string} puuid
 * @property {string} queueType
 * @property {string} tier
 * @property {string} rank
 * @property {int} leaguePoints
 * @property {int} wins
 * @property {int} losses
 * @property {boolean} hotStreak
 * @property {boolean} freshBlood
 * @property {boolean} inactive
 *
 * @returns {Array<LeagueEntryDTO>}
 * */
const getEntriesBySummoner = async (username) => {
    const [gameName, tagLine] = username.split("#").map((part) => part.trim());
    if (!gameName || !tagLine) {
        throw new Error("Invalid username format. Expected format: 'USER#TAG'");
    }
    const { id: summonerId } = await getSummonerInfoByPuuID({ gameName, tagLine });
    return makeRequest(`${ TFT_BASE_URL }/tft/league/v1/entries/by-summoner/${ summonerId }`, "GET");
};

/**
 * Simulated makeRequest function.
 * @template T
 * @param {string} endpoint
 * @param {string} method
 * @param {string?} body
 * @returns {Promise<T>}
 */
const makeRequest = async (endpoint, method, body) => {
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

const getEncryptedUserByID = async ({ gameName, tagLine }) => {
    const { puuid: encryptedUser } = await makeRequest(`${ API_BASE_URL }/riot/account/v1/accounts/by-riot-id/${ gameName }/${ tagLine }`, "GET");
    return encryptedUser;
};

const getSummonerInfoByPuuID = async ({ gameName, tagLine }) => {
    const puuid = await getEncryptedUserByID({ gameName, tagLine });
    return makeRequest(`${ TFT_BASE_URL }/tft/summoner/v1/summoners/by-puuid/${ puuid }`, "GET");
};

module.exports = { getEntriesBySummoner };
