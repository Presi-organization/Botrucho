import { ActivityType, PresenceStatusData } from 'discord.js';

interface Category {
  enabled: boolean;
  name: string;
  desc: string;
  aliases?: string[];
  hide?: boolean;
}

interface Links {
  invite: string | null;
}

interface Hook {
  id: string;
  token: string;
}

interface Database {
  MongoURL: string;
  cached: boolean;
  delay: number;
}

interface APIs {
  football: string;
  riot: string;
}

interface Integrations {
  aispeech: string;
}

export interface ActivityPresence {
  status: PresenceStatusData | undefined,
  type: ActivityType,
  content: string
}

export interface ConfigType {
  discord_client: string;
  token: string;
  owners: string[];
  footer: string;
  presence: ActivityPresence[];
  color: number;
  defaultLanguage: string;
  devMode: boolean;
  devServer: string;
  logAll: boolean;
  checkConfig: null;
  shards: number;
  categories: Record<string, Category>;
  links: Links;
  database: Database;
  isProduction: boolean;
  frisbeeHook: Hook;
  apis: APIs,
  integrations: Integrations
}
