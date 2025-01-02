import dotenv from 'dotenv';

dotenv.config();

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

export interface Config {
    token: string;
    owners: string[];
    footer: string;
    game: string;
    color: number;
    defaultLanguage: string;
    devMode: boolean;
    devServer: string;
    logAll: boolean;
    checkConfig: null;
    shards: number;
    categories: {
        [key: string]: Category;
    };
    links: Links;
    database: Database;
    isProduction: boolean;
    frisbeeHook: Hook
}

const config: Config = {
    token: process.env.DISCORD_TOKEN as string,
    owners: ["jonathanstrf", '.presi'],
    footer: "Botrucho",
    game: "nada importante",
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
