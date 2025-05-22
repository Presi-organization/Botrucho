import { BaseInteraction, Guild, Message } from 'discord.js';
import { EventDataController, GuildDataController, IEventData, IGuildData } from '@/mongodb';
import { TranslationElement, TranslationsType } from '@/types';
import en from '@languages/en.json';
import es from '@languages/es.json';

import config from '@/config';

function translateText(text: keyof TranslationsType, guildDBLang = 'en'): TranslationElement<string> {
  const languages: Record<string, TranslationsType> = { en, es };

  if (!text || !languages[guildDBLang] || !languages[guildDBLang][text]) {
    throw new Error(`Translate: Params error: Unknown text ID or missing text ${text}`);
  }

  const translation: TranslationElement<string> | string = languages[guildDBLang][text];
  if (typeof translation === 'object') {
    return translation;
  }

  throw new Error(`Translate: Params error: Translation for text ID ${text} is not an object`);
}

declare module 'discord.js' {
  interface Guild {
    addDB(guildData: GuildDataController, guildID?: string): Promise<IGuildData>;

    fetchDB(guildData: GuildDataController, guildID?: string): Promise<IGuildData>;

    addEventDB(event: EventDataController, messageID: string, eventName: string, calendarLink: string, guildID?: string): Promise<IEventData>;

    fetchEventDB(eventData: EventDataController, messageID: string, guildID?: string): Promise<IEventData | null>;

    translate(text: keyof TranslationsType, guildData: GuildDataController): Promise<TranslationElement<string>>;
  }

  interface BaseInteraction {
    translate(text: keyof TranslationsType, guildDBLang?: string): TranslationElement<string>;
  }

  interface Message {
    translate(text: keyof TranslationsType, guildDBLang?: string): TranslationElement<string>;
  }
}

Guild.prototype.addDB = async function (guildData: GuildDataController, guildID = ''): Promise<IGuildData> {
  if (!guildID || isNaN(parseInt(guildID))) {
    guildID = this.id;
  }
  return guildData.addGuild({
    serverID: guildID,
    lang: config.defaultLanguage,
    color: '0x3A871F',
  } as never);
};

Guild.prototype.fetchDB = async function (guildData: GuildDataController, guildID = ''): Promise<IGuildData> {
  if (!guildID || isNaN(parseInt(guildID))) {
    guildID = this.id;
  }
  let data = await guildData.showGuild(guildID);
  if (!data) data = await this.addDB(guildData);
  return data;
};

Guild.prototype.addEventDB = async function (event: EventDataController, messageID: string, eventName: string, calendarLink: string, guildID = ''): Promise<IEventData> {
  if (!guildID || isNaN(parseInt(guildID))) {
    guildID = this.id;
  }

  return event.addEvent({
    serverID: guildID,
    messageID: messageID,
    eventName: eventName,
    calendarLink: calendarLink
  } as never);
};

Guild.prototype.fetchEventDB = async function (eventData: EventDataController, messageID: string, guildID = ''): Promise<IEventData | null> {
  if (!guildID || isNaN(parseInt(guildID))) {
    guildID = this.id;
  }
  return eventData.showEvent(guildID, messageID);
};

BaseInteraction.prototype.translate = function (text: keyof TranslationsType, guildDBLang = 'en'): TranslationElement<string> {
  return translateText(text, guildDBLang);
};

Message.prototype.translate = function (text: keyof TranslationsType, guildDBLang = 'en'): TranslationElement<string> {
  return translateText(text, guildDBLang);
};

Guild.prototype.translate = async function (text: keyof TranslationsType, guildData: GuildDataController): Promise<TranslationElement<string>> {
  if (!text) {
    throw new Error('No text provided');
  }

  const guild = await guildData.showGuild(this.id);
  const langDB = guild?.lang || 'en';
  return translateText(text, langDB);
};
