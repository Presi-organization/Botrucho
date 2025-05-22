import { Client, ClientOptions, Collection, Interaction, Message } from 'discord.js';
import { Player } from 'discord-player';
import { AttendanceDataController, EventDataController, GuildDataController } from '@/mongodb';
import { ICommand, ConfigType } from '@/types';

import config from '@/config';

export class Botrucho extends Client {
  config: ConfigType;
  color: number;
  owners: string[];
  footer: string;
  defaultLanguage: string;
  log?: boolean;
  devMode: boolean;
  deleted_messages: Set<Interaction | Message>;
  player: Player;
  queue: Map<unknown, unknown>;
  commands: Collection<string, ICommand>;
  guildData: GuildDataController;
  eventData: EventDataController;
  eventAttendanceData: AttendanceDataController;

  constructor(options: ClientOptions) {
    super(options);
    this.config = config;
    this.color = config.color;
    this.owners = config.owners;
    this.footer = config.footer.slice(0, 32);
    this.defaultLanguage = config.defaultLanguage;
    this.log = config.logAll;
    this.devMode = config.devMode || false;
    this.deleted_messages = new Set();
    this.player = new Player(this);
    this.queue = new Map();
    this.commands = new Collection();
    this.guildData = new GuildDataController();
    this.eventData = new EventDataController();
    this.eventAttendanceData = new AttendanceDataController();
  }
}

