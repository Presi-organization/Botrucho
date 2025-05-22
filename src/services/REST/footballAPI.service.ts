import { ApiCompetition, ApiMatch, Competitions, FootballResult, Matches, Results } from '@/types';
import { logger } from '@/utils';

import config from '@/config';

const FOOTBALL_URI = 'https://api.football-data.org/v4';
const headers = new Headers({
  'X-Auth-Token': config.apis.football,
});

const _makeRequest = async <T>(endpoint: string, method: string, body?: unknown): Promise<T> => {
  const request = new Request(`${endpoint}`, {
    method,
    headers: headers,
    body: JSON.stringify(body),
  });
  const response: Response = await fetch(request);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return await response.json() as T;
};

const _convertToGMTMinus5 = (utcDate: string): string => {
  const date = new Date(utcDate);

  let formattedDate = date.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  formattedDate = formattedDate.replace(/\sde\s/g, '/').replace(',', '');
  formattedDate = formattedDate.replace(/\/(\w+)/, (_match, month) => `/${month.charAt(0).toUpperCase() + month.slice(1)}`);
  return formattedDate;
};

const _buildMatches = (matches: ApiMatch[]): Matches => {
  const nextStage: string = matches[0].stage;
  const nextRoundMatches: ApiMatch[] = matches.filter((match: ApiMatch) => match.stage === nextStage);

  return {
    stage: nextStage,
    matches: nextRoundMatches.map((match: ApiMatch) => ({
      homeTeam: match.homeTeam.shortName,
      awayTeam: match.awayTeam.shortName,
      localDate: _convertToGMTMinus5(match.utcDate),
      stage: match.stage
    }))
  }
}

const _buildResults = (results: ApiMatch[]): Results => {
  const previousMatch: ApiMatch = results.slice(-1)[0];
  const previousMatches: ApiMatch[] = results.filter(
    (match: ApiMatch) => match.matchday === previousMatch.matchday && match.stage === previousMatch.stage
  );

  return {
    stage: previousMatches[0].stage,
    results: previousMatches.map((match: ApiMatch) => ({
      homeTeam: match.homeTeam.shortName,
      homeResult: match.score.fullTime.home,
      awayTeam: match.awayTeam.shortName,
      awayResult: match.score.fullTime.away,
      localDate: _convertToGMTMinus5(match.utcDate)
    }))
  }
}

export const getCompetitions = async (competition: Competitions, status: 'SCHEDULED' | 'FINISHED'): Promise<FootballResult> => {
  try {
    const url = `${FOOTBALL_URI}/competitions/${competition}/matches?status=${status}`;
    const response: ApiCompetition = await _makeRequest<ApiCompetition>(url, 'GET');

    switch (status) {
      case 'SCHEDULED':
        return _buildMatches(response.matches);
      case 'FINISHED':
        return _buildResults(response.matches);
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      logger.error(`Error fetching competitions: ${e.message}`);
    } else {
      logger.error('Unknown error occurred while fetching competitions');
    }
    return undefined;
  }
}
