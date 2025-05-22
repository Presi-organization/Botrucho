import { LeagueEntryDTO } from '@/types';

import config from '@/config';

const API_BASE_URL = 'https://americas.api.riotgames.com';
const TFT_BASE_URL = 'https://la1.api.riotgames.com';
const myHeaders = new Headers({
  'Content-Type': 'application/json',
  'X-Riot-Token': config.apis.riot
});

const _makeRequest = async <T>(endpoint: string, method: string, body?: unknown): Promise<T> => {
  const request = new Request(`${endpoint}`, {
    method,
    headers: myHeaders,
    body: JSON.stringify(body),
  });
  const response: Response = await fetch(request);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return await response.json() as T;
};

const _getEncryptedUserByID = async ({ gameName, tagLine }: { gameName: string; tagLine: string }): Promise<string> => {
  const { puuid: encryptedUser } = await _makeRequest<{
    puuid: string
  }>(`${API_BASE_URL}/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`, 'GET');
  return encryptedUser;
};

const _getSummonerInfoByPuuID = async ({ gameName, tagLine }: { gameName: string; tagLine: string }): Promise<{
  id: string
}> => {
  const puuid: string = await _getEncryptedUserByID({ gameName, tagLine });
  return _makeRequest<{ id: string }>(`${TFT_BASE_URL}/tft/summoner/v1/summoners/by-puuid/${puuid}`, 'GET');
};

export const getEntriesBySummoner = async (username: string): Promise<LeagueEntryDTO[]> => {
  const [gameName, tagLine] = username.split('#').map((part) => part.trim());
  if (!gameName || !tagLine) {
    throw new Error('Invalid username format. Expected format: \'USER#TAG\'');
  }
  const { id: summonerId } = await _getSummonerInfoByPuuID({ gameName, tagLine });
  return _makeRequest<LeagueEntryDTO[]>(`${TFT_BASE_URL}/tft/league/v1/entries/by-summoner/${summonerId}`, 'GET');
};
