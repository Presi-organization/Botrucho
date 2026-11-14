import { footballCompetitions } from '@/config/football-competitions';
import { bogotaDate, bogotaTime } from '@/services/football/date.util';
import type { FootballKeys, FootballMatch, FootballPage, TranslationElement } from '@/types';

const MAX_DESCRIPTION = 3800;

export const filterByDate = (matches: FootballMatch[], dateKey: string): FootballMatch[] =>
  matches.filter((match) => bogotaDate(match.kickoff) === dateKey);

const winner = (name: string, won: boolean): string => (won ? `**${name}**` : name);

const matchLine = (match: FootballMatch, texts: TranslationElement<FootballKeys>): string => {
  const { home, away, homeScore, awayScore } = match;
  if (match.state === 'pre' || homeScore === undefined || awayScore === undefined) {
    return `\`${bogotaTime(match.kickoff)}\` ${home} vs ${away}`;
  }
  const tag = match.state === 'in' ? texts.LIVE : texts.FINISHED;
  const finished = match.state === 'post';
  const homeName = winner(home, finished && homeScore > awayScore);
  const awayName = winner(away, finished && awayScore > homeScore);
  return `\`${tag}\` ${homeName} ${homeScore} - ${awayScore} ${awayName}`;
};

const byLiveFirst = (a: FootballMatch, b: FootballMatch): number =>
  Number(b.state === 'in') - Number(a.state === 'in');

export const buildFootballPages = ({
  title,
  matches,
  competitionKeys,
  maxPages = Infinity,
  moreHint = '',
  texts,
}: {
  title: string;
  matches: FootballMatch[];
  competitionKeys?: string[];
  maxPages?: number;
  moreHint?: string;
  texts: TranslationElement<FootballKeys>;
}): FootballPage[] => {
  const pages: { description: string; count: number }[] = [];
  let current = '';
  let currentCount = 0;

  const append = (text: string): void => {
    current += (current ? '\n' : '') + text;
  };
  const flush = (): void => {
    if (current) pages.push({ description: current, count: currentCount });
    current = '';
    currentCount = 0;
  };

  for (const competition of footballCompetitions) {
    if (competitionKeys && !competitionKeys.includes(competition.key)) continue;
    const group = matches
      .filter((match) => match.competitionKey === competition.key)
      .sort(byLiveFirst);
    if (!group.length) continue;

    const header = `**${competition.emoji} ${competition.name}**`;

    if (current && current.length + header.length + 2 > MAX_DESCRIPTION) flush();
    append(current ? `\n${header}` : header);

    for (const match of group) {
      const line = matchLine(match, texts);
      if (current.length + line.length + 1 > MAX_DESCRIPTION) {
        flush();
        append(`${header} (${texts.CONT})`);
      }
      append(line);
      currentCount++;
    }
  }
  flush();

  const kept = pages.slice(0, maxPages);
  const omitted = pages.slice(maxPages).reduce((total, page) => total + page.count, 0);
  if (omitted > 0) {
    const more = omitted === 1 ? texts.MORE_ONE : texts.MORE_MANY.replace('${count}', `${omitted}`);
    const note = `${more} ${moreHint}`.trim();
    kept[kept.length - 1].description += `\n\n*${note}*`;
  }

  return kept.map((page, index) => ({
    title: kept.length > 1 ? `${title} (${index + 1}/${kept.length})` : title,
    description: page.description,
  }));
};
