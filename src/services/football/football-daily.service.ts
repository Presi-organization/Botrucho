import type { Botrucho } from '@/mongodb';
import { addDays, bogotaDate, formatLongDate } from '@/services/football/date.util';
import { buildFootballPages, filterByDate } from '@/services/football/football-embed';
import { getEspnMatches } from '@/services/REST';
import type { FootballPage } from '@/types';
import { Info, logger } from '@/utils';

const UNREACHABLE_CHANNEL_CODES = [10003, 50001];

export const buildDailyPages = async (
  dateKey: string = bogotaDate(),
): Promise<FootballPage[] | undefined> => {
  const matches = await getEspnMatches(dateKey, addDays(dateKey, 1));
  if (!matches) return undefined;
  const pages = buildFootballPages({
    title: `⚽ Partidos de hoy · ${formatLongDate(dateKey)}`,
    matches: filterByDate(matches, dateKey),
    maxPages: 1,
    moreHint: 'Usa `/football` para ver todos.',
  });
  return pages.length ? pages : undefined;
};

export const postDailyFootball = async (client: Botrucho): Promise<void> => {
  const dateKey = bogotaDate();
  const guilds = await client.guildData.getFootballChannels();
  const pending = guilds.filter(
    ({ serverID, footballChannelID, footballLastPostDate }) =>
      footballChannelID && footballLastPostDate !== dateKey && client.guilds.cache.has(serverID),
  );
  if (!pending.length) return;

  const pages = await buildDailyPages(dateKey);
  if (!pages) {
    logger.log('No football matches to post today');
    return;
  }

  for (const { serverID, footballChannelID } of pending) {
    try {
      const channel = await client.channels.fetch(footballChannelID as string);
      if (!channel?.isSendable()) {
        await client.guildData.setFootballChannel(serverID, null);
        continue;
      }
      for (const page of pages) await channel.send({ embeds: [Info(page)] });
      await client.guildData.setFootballLastPostDate(serverID, dateKey);
    } catch (error: unknown) {
      const code = (error as { code?: number }).code;
      if (code !== undefined && UNREACHABLE_CHANNEL_CODES.includes(code)) {
        await client.guildData.setFootballChannel(serverID, null);
      } else {
        logger.error(`Error posting daily football to guild ${serverID}:`, error);
      }
    }
  }
};
