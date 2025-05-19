import { ApiMatch, Competitions, FootballResult, Matches, Results } from "@customTypes/Football";
import * as process from 'node:process';

const FOOTBALL_URI = "https://api.football-data.org/v4";
const headers = new Headers({
  "X-Auth-Token": process.env.FOOTBALL_TOKEN as string,
});

const makeRequest = async <T>(endpoint: string, method: string, body?: any): Promise<T> => {
  const request = new Request(`${endpoint}`, {
    method,
    headers: headers,
    body: JSON.stringify(body),
  });
  const response: Response = await fetch(request);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
};

function convertToGMTMinus5(utcDate: string): string {
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
}

export const getCompetitions = async (competition: Competitions, status: "SCHEDULED" | "FINISHED"): Promise<FootballResult> => {
  try {
    const url = `${FOOTBALL_URI}/competitions/${competition}/matches?status=${status}`;
    const response: any = await makeRequest(url, "GET");

    switch (status) {
      case "SCHEDULED":
        return matches(response.matches);
      case "FINISHED":
        return results(response.matches);
    }
  } catch (e) {
  }
}

const matches = (matches: ApiMatch[]): Matches => {
  const nextStage: string = matches[0].stage;
  const nextRoundMatches: ApiMatch[] = matches.filter((match: ApiMatch) => match.stage === nextStage);

  return {
    stage: nextStage,
    matches: nextRoundMatches.map((match: ApiMatch) => ({
      homeTeam: match.homeTeam.shortName,
      awayTeam: match.awayTeam.shortName,
      localDate: convertToGMTMinus5(match.utcDate),
      stage: match.stage
    }))
  }
}

const results = (results: ApiMatch[]): Results => {
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
      localDate: convertToGMTMinus5(match.utcDate)
    }))
  }
}
