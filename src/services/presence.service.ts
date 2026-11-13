import { ActivityType } from 'discord.js';

import type { Botrucho } from '@/mongodb';
import { PresenceSource } from '@/runtime/presence';
import {
  CurrentWeather,
  describeWeather,
  getCurrentWeather,
} from '@/services/REST/openMeteo.service';

const WEATHER_TTL_MS = 15 * 60_000;
const SHORT_MS = 30_000;
const LONG_MS = 60_000;

const plural = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? '' : 'es'}`;

const sumAcrossShards = async (client: Botrucho, local: () => number, path: string) => {
  if (!client.shard) return local();
  const values = (await client.shard.fetchClientValues(path)) as number[];
  return values.reduce((total, value) => total + value, 0);
};

export const buildPresenceSources = (client: Botrucho): PresenceSource[] => {
  let weather: { value: CurrentWeather; at: number } | undefined;

  return [
    ...client.config.presence.map((line) => () => ({ ...line, durationMs: SHORT_MS })),
    async () => {
      const servers = await sumAcrossShards(
        client,
        () => client.guilds.cache.size,
        'guilds.cache.size',
      );
      return {
        type: ActivityType.Custom,
        content: `🏠 Cuidando ${plural(servers, 'servidor')}`,
        durationMs: LONG_MS,
      };
    },
    () => {
      const playing = client.player.nodes.cache.filter((queue) => queue.isPlaying()).size;
      if (!playing) return null;
      return {
        type: ActivityType.Custom,
        content: `🎵 Sonando música en ${plural(playing, 'servidor')}`,
        durationMs: LONG_MS,
      };
    },
    async () => {
      const { requests } = await client.aiLimiter.usage();
      if (!requests) return null;
      const questions = requests === 1 ? '1 pregunta' : `${requests} preguntas`;
      return {
        type: ActivityType.Custom,
        content: `🤖 Hoy he respondido ${questions}`,
        durationMs: LONG_MS,
      };
    },
    async () => {
      if (!weather || Date.now() - weather.at >= WEATHER_TTL_MS)
        weather = { value: await getCurrentWeather(), at: Date.now() };
      const { temperature, code, isDay } = weather.value;
      return {
        type: ActivityType.Custom,
        content: `${describeWeather(code, isDay)} en Medellín, ${Math.round(temperature)}°C`,
        durationMs: LONG_MS,
      };
    },
  ];
};
