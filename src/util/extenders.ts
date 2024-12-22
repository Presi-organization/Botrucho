import { Message, Guild, CommandInteraction } from 'discord.js';
import EventDataController from '@mongodb/controllers/EventData';
import GuildDataController from '@mongodb/controllers/GuildData';
import { IGuildData } from "@mongodb/models/GuildData";
import { IEventData } from "@mongodb/models/EventData";
import lang from '@languages';
import config from '@config';

interface Translations {
    [key: string]: {
        [key: string]: string | {
            [key: string]: string;
        };
    };
}

function translateText(text: string, guildDBLang: string = 'en'): string {
    if (!text || !(lang.translations as Translations)[text]) {
        throw new Error(`Translate: Params error: Unknown text ID or missing text ${ text }`);
    }
    if (!guildDBLang) {
        console.log('Missing guildDBLang');
        return '';
    }
    const translation = (lang.translations as Translations)[text][guildDBLang];
    if (typeof translation === 'string') {
        return translation;
    }
    throw new Error(`Translate: Params error: Translation for text ID ${ text } is not a string`);
}

declare module 'discord.js' {
    interface Guild {
        addDB(guildData: GuildDataController, guildID?: string): Promise<IGuildData>;

        fetchDB(guildData: GuildDataController, guildID?: string): Promise<IGuildData>;

        addEventDB(event: EventDataController, messageID: string, eventName: string, calendarLink: string, guildID?: string): Promise<IEventData>;

        fetchEventDB(eventData: EventDataController, messageID: string, guildID?: string): Promise<IEventData | null>;

        translate(text: string, guildData: GuildDataController): Promise<string>;
    }

    interface CommandInteraction {
        translate(text: string, guildDBLang?: string): string;
    }

    interface Message {
        translate(text: string, guildDBLang?: string): string;
    }
}

Guild.prototype.addDB = async function (guildData: GuildDataController, guildID: string = ''): Promise<IGuildData> {
    if (!guildID || isNaN(parseInt(guildID))) {
        guildID = this.id;
    }
    return guildData.addGuild({
        serverID: guildID,
        lang: config.defaultLanguage,
        color: "0x3A871F",
    } as any);
};

Guild.prototype.fetchDB = async function (guildData: GuildDataController, guildID: string = ''): Promise<IGuildData> {
    if (!guildID || isNaN(parseInt(guildID))) {
        guildID = this.id;
    }
    let data = await guildData.showGuild(guildID);
    if (!data) data = await this.addDB(guildData);
    return data;
};

Guild.prototype.addEventDB = async function (event: EventDataController, messageID: string, eventName: string, calendarLink: string, guildID: string = ''): Promise<IEventData> {
    if (!guildID || isNaN(parseInt(guildID))) {
        guildID = this.id;
    }

    return event.addEvent({
        serverID: guildID,
        messageID: messageID,
        eventName: eventName,
        calendarLink: calendarLink
    } as any);
};

Guild.prototype.fetchEventDB = async function (eventData: EventDataController, messageID: string, guildID: string = ''): Promise<IEventData | null> {
    if (!guildID || isNaN(parseInt(guildID))) {
        guildID = this.id;
    }
    return eventData.showEvent(guildID, messageID);
};

CommandInteraction.prototype.translate = function (text: string, guildDBLang: string = 'en'): string {
    return translateText(text, guildDBLang);
};

Message.prototype.translate = function (text: string, guildDBLang: string = 'en'): string {
    return translateText(text, guildDBLang);
};

Guild.prototype.translate = async function (text: string, guildData: GuildDataController): Promise<string> {
    if (!text) {
        throw new Error('No text provided');
    }
    if (!(lang.translations as Translations)[text]) {
        throw new Error(`Unknown text ID "${ text }"`);
    }
    const guild = await guildData.showGuild(this.id);
    const langDB = guild?.lang || 'en';
    return translateText(text, langDB);
};
