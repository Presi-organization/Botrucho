import { normalizeEvents } from '@/services/REST/espn.normalizer';
import type { FootballMatch } from '@/types';
import { logger } from '@/utils';

const ESPN_SCOREBOARD_URI = 'https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard';
const CACHE_TTL_MS = 10 * 60_000;

const cache = new Map<string, { at: number; matches: FootballMatch[] }>();

const compact = (dateKey: string): string => dateKey.replaceAll('-', '');

const fetchDay = async (dateKey: string): Promise<FootballMatch[] | undefined> => {
  const cached = cache.get(dateKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.matches;

  try {
    const response = await fetch(`${ESPN_SCOREBOARD_URI}?dates=${compact(dateKey)}&limit=500`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    const { events } = (await response.json()) as { events?: unknown };
    const matches = normalizeEvents(events);
    cache.set(dateKey, { at: Date.now(), matches });
    return matches;
  } catch (error: unknown) {
    logger.error(
      `Error fetching ESPN scoreboard for ${dateKey}: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return cached?.matches;
  }
};

/**
 * ESPN buckets events by its own day boundary, which does not line up with Bogota's, so the
 * requested day and the next one are both fetched and the caller filters by Bogota date.
 */
export const getEspnMatches = async (
  dateKey: string,
  nextDateKey: string,
): Promise<FootballMatch[] | undefined> => {
  const days = await Promise.all([fetchDay(dateKey), fetchDay(nextDateKey)]);
  if (days.every((day) => day === undefined)) return undefined;
  const seen = new Set<string>();
  return days
    .flatMap((day) => day ?? [])
    .filter((match) => {
      const id = `${match.competitionKey}|${match.home}|${match.away}|${match.kickoff.getTime()}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
};
