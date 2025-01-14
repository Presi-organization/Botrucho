import { ActivityType, PresenceStatusData } from "discord.js";

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

export interface ActivityPresence {
    status: PresenceStatusData | undefined,
    type: ActivityType,
    content: string
}

export interface Config {
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
    categories: {
        [key: string]: Category;
    };
    links: Links;
    database: Database;
    isProduction: boolean;
    frisbeeHook: Hook
}
