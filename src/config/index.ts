import { ActivityType } from "discord.js";
import { Config } from "@customTypes/Config";
import dotenv from 'dotenv';

dotenv.config();

const config: Config = {
  token: process.env.DISCORD_TOKEN as string,
  owners: ["jonathanstrf", '.presi'],
  footer: "Botrucho",
  presence: [
    { status: 'dnd', type: ActivityType.Competing, content: "nada importante" },
    { status: 'dnd', type: ActivityType.Watching, content: 'el techo (del server)' },
    { status: 'dnd', type: ActivityType.Listening, content: 'los lloros de los @BOTS' },
    { status: 'dnd', type: ActivityType.Custom, content: 'Planeando un ataque inminente' }
  ],
  color: 0xF5B719,
  defaultLanguage: "en",
  devMode: true,
  devServer: "775108414560534588",
  logAll: true,
  checkConfig: null,
  shards: 1,
  categories: {
    configuration: { enabled: true, name: "Configuration", desc: "Setup the bot with the configuration commands" },
    utilities: { enabled: true, name: "Utilities", desc: "Some useful commands", aliases: ["general"] },
    music: { enabled: true, name: "Music", desc: "Listen music with bot" },
    owner: { hide: true, enabled: true, name: "Owner", desc: "Manage your bot with the owner commands" }
  },
  links: {
    invite: null
  },
  database: {
    MongoURL: process.env.MONGO_URI as string,
    cached: false,
    delay: 300000 * 4,
  },
  isProduction: process.env.NODE_ENV === "production",
  frisbeeHook: {
    id: process.env.WEBHOOK_ID as string,
    token: process.env.WEBOOK_TOKEN as string
  }
};

export default config;
