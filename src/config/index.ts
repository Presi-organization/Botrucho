import { ActivityType } from 'discord.js';
import { ConfigType } from '@/types';
import * as process from 'node:process';

const config: ConfigType = {
  discord_client: process.env.CLIENT_ID as string,
  token: process.env.DISCORD_TOKEN as string,
  owners: ['429375441267195924', '219637158162464768'],
  footer: 'Botrucho',
  presence: [
    { status: 'dnd', type: ActivityType.Competing, content: 'nada importante por ahora' },
    { status: 'dnd', type: ActivityType.Watching, content: 'el techo (del server)' },
    { status: 'dnd', type: ActivityType.Listening, content: 'los lloros de los @BOTS' },
    { status: 'dnd', type: ActivityType.Custom, content: 'Planeando un ataque inminente' },
    { status: 'dnd', type: ActivityType.Listening, content: 'Pasarex is god' },
    { status: 'dnd', type: ActivityType.Custom, content: 'Pepinillos, alitas y pasarex' }
  ],
  color: 0xF5B719,
  defaultLanguage: 'en',
  devMode: true,
  devServer: '775108414560534588',
  logAll: true,
  checkConfig: null,
  shards: 1,
  categories: {
    configuration: { enabled: true, name: 'Configuration', desc: 'Setup the bot with the configuration commands' },
    utilities: { enabled: true, name: 'Utilities', desc: 'Some useful commands', aliases: ['general'] },
    music: { enabled: true, name: 'Music', desc: 'Listen music with bot' },
    owner: { hide: true, enabled: true, name: 'Owner', desc: 'Manage your bot with the owner commands' }
  },
  links: {
    invite: null
  },
  database: {
    MongoURL: process.env.MONGO_URI as string,
    cached: false,
    delay: 300000 * 4,
  },
  isProduction: process.env.NODE_ENV === 'production',
  frisbeeHook: {
    id: process.env.WEBHOOK_ID as string,
    token: process.env.WEBOOK_TOKEN as string
  },
  apis: {
    football: process.env.FOOTBALL_TOKEN as string,
    riot: process.env.RIOT_TOKEN as string,
  },
  integrations: {
    aispeech: process.env.AISPEECH_TOKEN as string,
  },
};

export default config;
