import { Client, ClientOptions, Collection } from "discord.js";
import { Player } from "discord-player";
import EventAttendanceData from "@mongodb/controllers/EventAttendanceData";
import EventData from "@mongodb/controllers/EventData";
import GuildData from "@mongodb/controllers/GuildData";
import { createClientVars } from "@util/functions";

interface BotruchoOptions extends ClientOptions {
  config?: any;
  color?: number;
  owners?: string[];
  footer?: string;
  defaultLanguage?: string;
  log?: any;
  devMode?: boolean;
}

class Botrucho extends Client {
  config: any;
  color: number;
  owners: string[];
  footer: string;
  defaultLanguage: string;
  log: any;
  devMode: boolean;
  deleted_messages: Set<any>;
  player: Player;
  queue: Map<any, any>;
  commands: Collection<string, any>;
  guildData: GuildData;
  eventData: EventData;
  eventAttendanceData: EventAttendanceData;

  constructor(options: BotruchoOptions) {
    super(options);
    this.config = options.config;
    this.color = options.color || 0;
    this.owners = options.owners || [];
    this.footer = options.footer || '';
    this.defaultLanguage = options.defaultLanguage || '';
    this.log = options.log;
    this.devMode = options.devMode || false;
    this.deleted_messages = new Set();
    this.player = new Player(this);
    createClientVars(this);
    this.queue = new Map();
    this.commands = new Collection();
    this.guildData = new GuildData();
    this.eventData = new EventData();
    this.eventAttendanceData = new EventAttendanceData();
  }
}

export default Botrucho;
