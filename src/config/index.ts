import { randomUUID } from 'crypto';
import * as process from 'node:process';

import { ActivityType } from 'discord.js';

import { ConfigType } from '@/types';

const config: ConfigType = {
  discord_client: process.env.CLIENT_ID as string,
  token: process.env.DISCORD_TOKEN as string,
  owners: ['429375441267195924', '219637158162464768'],
  instanceId: process.env.INSTANCE_ID || randomUUID(),
  footer: 'Botrucho',
  presence: [
    { type: ActivityType.Competing, content: '🥇 nada importante por ahora' },
    { type: ActivityType.Listening, content: '😭 los lloros de los @BOTS' },
    { type: ActivityType.Watching, content: '🙄 quién deja el server en visto' },
    { type: ActivityType.Listening, content: '🪗 vallenatos a todo volumen' },
    { type: ActivityType.Custom, content: '😈 Planeando un ataque inminente' },
    { type: ActivityType.Custom, content: '☕ Tinto en mano, listo pa’l parche' },
    { type: ActivityType.Custom, content: '🫓 Una arepita y a camellar' },
    { type: ActivityType.Custom, content: '💬 Mencióname: @Botrucho ¿qué jugamos?' },
    { type: ActivityType.Custom, content: '🎶 /play y pongo la música' },
    { type: ActivityType.Custom, content: '🏆 /tftelo para ver tu rango' },
    { type: ActivityType.Custom, content: '🎲 ¿No se deciden? /dado o /coin' },
  ],
  color: 0xf5b719,
  defaultLanguage: 'en',
  devMode: true,
  devServer: '775108414560534588',
  logAll: true,
  checkConfig: null,
  shards: 1,
  categories: {
    configuration: {
      enabled: true,
      name: 'Configuration',
      desc: 'Setup the bot with the configuration commands',
    },
    utilities: {
      enabled: true,
      name: 'Utilities',
      desc: 'Some useful commands',
      aliases: ['general'],
    },
    music: { enabled: true, name: 'Music', desc: 'Listen music with bot' },
    owner: {
      hide: true,
      enabled: true,
      name: 'Owner',
      desc: 'Manage your bot with the owner commands',
    },
  },
  links: {
    invite: null,
  },
  database: {
    MongoURL: process.env.MONGO_URI as string,
    cached: false,
    delay: 300000 * 4,
  },
  isProduction: process.env.NODE_ENV === 'production',
  frisbeeHook: {
    id: process.env.WEBHOOK_ID as string,
    token: process.env.WEBOOK_TOKEN as string,
  },
  apis: {
    riot: process.env.RIOT_TOKEN as string,
  },
  integrations: {
    aispeech: process.env.AISPEECH_TOKEN as string,
    vertexAi: process.env.VERTEX_API_KEY ?? '',
  },
};

export default config;
