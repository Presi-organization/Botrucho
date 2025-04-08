import { Message, Guild, BaseInteraction } from 'discord.js';
import EventDataController from '@mongodb/controllers/EventData';
import GuildDataController from '@mongodb/controllers/GuildData';
import { IGuildData } from "@mongodb/models/GuildData";
import { IEventData } from "@mongodb/models/EventData";
import { TranslationElement, Translations } from "@customTypes/Translations";
import en from '@languages/en.json';
import es from '@languages/es.json';
import config from '@config';

function translateText(text: keyof Translations, guildDBLang: string = 'en'): TranslationElement<string> {
    const languages: { [key: string]: Translations } = { en, es };

    if (!text || !languages[guildDBLang] || !languages[guildDBLang][text]) {
        throw new Error(`Translate: Params error: Unknown text ID or missing text ${ text }`);
    }

    const translation: TranslationElement<string> | string = languages[guildDBLang][text];
    if (typeof translation === 'object') {
        return translation;
    }

    throw new Error(`Translate: Params error: Translation for text ID ${ text } is not an object`);
}

declare module 'discord.js' {
    interface Guild {
        addDB(guildData: GuildDataController, guildID?: string): Promise<IGuildData>;

        fetchDB(guildData: GuildDataController, guildID?: string): Promise<IGuildData>;

        addEventDB(event: EventDataController, messageID: string, eventName: string, calendarLink: string, guildID?: string): Promise<IEventData>;

        fetchEventDB(eventData: EventDataController, messageID: string, guildID?: string): Promise<IEventData | null>;

        translate(text: keyof Translations, guildData: GuildDataController): Promise<TranslationElement<string>>;
    }

    interface BaseInteraction {
        translate(text: keyof Translations, guildDBLang?: string): TranslationElement<string>;
    }

    interface Message {
        translate(text: keyof Translations, guildDBLang?: string): TranslationElement<string>;
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

BaseInteraction.prototype.translate = function (text: keyof Translations, guildDBLang: string = 'en'): TranslationElement<string> {
    return translateText(text, guildDBLang);
};

Message.prototype.translate = function (text: keyof Translations, guildDBLang: string = 'en'): TranslationElement<string> {
    return translateText(text, guildDBLang);
};

Guild.prototype.translate = async function (text: keyof Translations, guildData: GuildDataController): Promise<TranslationElement<string>> {
    if (!text) {
        throw new Error('No text provided');
    }

    const guild = await guildData.showGuild(this.id);
    const langDB = guild?.lang || 'en';
    return translateText(text, langDB);
};
