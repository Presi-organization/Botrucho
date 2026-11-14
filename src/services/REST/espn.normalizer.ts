import { findCompetitionByEspnId } from '@/config/football-competitions';
import type { FootballMatch, FootballMatchState } from '@/types';

interface EspnCompetitor {
  homeAway?: string;
  score?: string;
  team?: { displayName?: string; name?: string };
}

export interface EspnEvent {
  uid?: string;
  date?: string;
  status?: { type?: { state?: string } };
  competitions?: { competitors?: EspnCompetitor[] }[];
}

const STATES: FootballMatchState[] = ['pre', 'in', 'post'];

const toScore = (value?: string): number | undefined => {
  const score = Number(value);
  return value === undefined || value === '' || Number.isNaN(score) ? undefined : score;
};

const normalizeEvent = (event: EspnEvent | null | undefined): FootballMatch | undefined => {
  if (!event || typeof event !== 'object') return undefined;
  const espnId = event.uid?.match(/~l:(\d+)/)?.[1];
  const competition = espnId ? findCompetitionByEspnId(espnId) : undefined;
  if (!competition || !event.date) return undefined;

  const kickoff = new Date(event.date);
  const state = event.status?.type?.state as FootballMatchState | undefined;
  const competitors = event.competitions?.[0]?.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === 'home');
  const away = competitors.find((c) => c.homeAway === 'away');
  const homeName = home?.team?.displayName ?? home?.team?.name;
  const awayName = away?.team?.displayName ?? away?.team?.name;
  if (Number.isNaN(kickoff.getTime()) || !state || !STATES.includes(state)) return undefined;
  if (!homeName || !awayName) return undefined;

  return {
    competitionKey: competition.key,
    home: homeName,
    away: awayName,
    kickoff,
    state,
    homeScore: state === 'pre' ? undefined : toScore(home?.score),
    awayScore: state === 'pre' ? undefined : toScore(away?.score),
  };
};

export const normalizeEvents = (events: unknown): FootballMatch[] => {
  if (!Array.isArray(events)) return [];
  return events
    .map((event) => normalizeEvent(event as EspnEvent))
    .filter((match): match is FootballMatch => match !== undefined)
    .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
};
