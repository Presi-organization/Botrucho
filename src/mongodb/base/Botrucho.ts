import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Player } from 'discord-player';
import { Client, ClientOptions, Collection, Interaction, Message } from 'discord.js';

import CommandLoader from '@/commands/CommandLoader';
import config from '@/config';
import {
  AttendanceDataController,
  BotInstanceDataController,
  CronDataController,
  EventDataController,
  GuildDataController,
} from '@/mongodb';
import { AiSettingsModel } from '@/mongodb/models/AiSettings';
import { AiUsageModel } from '@/mongodb/models/AiUsage';
import { AiUsageLimiter } from '@/runtime/ai-limits';
import { AiSettingsStore, defaultAiSettings } from '@/runtime/ai-settings';
import { CronManager } from '@/services';
import { ConfigType, ICommand } from '@/types';

const AI_SETTINGS_ID = 'global';
const DEFAULT_INSTRUCTION_PATH = join(process.cwd(), '/assets/ai/system-instruction.md');

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
  commandLoader: CommandLoader;
  cronManager: CronManager;
  guildData: GuildDataController;
  eventData: EventDataController;
  eventAttendanceData: AttendanceDataController;
  botInstance: BotInstanceDataController;
  cronData: CronDataController;
  aiLimiter: AiUsageLimiter;
  aiSettings: AiSettingsStore;

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
    this.commandLoader = new CommandLoader(this);
    this.cronManager = new CronManager(this);
    this.guildData = new GuildDataController();
    this.eventData = new EventDataController();
    this.eventAttendanceData = new AttendanceDataController();
    this.botInstance = new BotInstanceDataController();
    this.cronData = new CronDataController();
    this.aiLimiter = new AiUsageLimiter(AiUsageModel);
    this.aiSettings = new AiSettingsStore(
      {
        load: () => AiSettingsModel.findById(AI_SETTINGS_ID).lean().exec(),
        save: (settings) =>
          AiSettingsModel.updateOne(
            { _id: AI_SETTINGS_ID },
            { $set: settings },
            { upsert: true },
          ).exec(),
      },
      // The repo's instruction file is the default until edited from /ai settings.
      () => defaultAiSettings(readFileSync(DEFAULT_INSTRUCTION_PATH, 'utf8').trim()),
    );
  }
}
