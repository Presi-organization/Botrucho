import { CommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import { Botrucho, IGuildData } from '@/mongodb';

export interface Command {
  /** Command name identifier */
  name: string;
  /** Description of what the command does */
  description: string;
  /** SlashCommand builder defining command structure */
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  /** Function that handles the command logic */
  execute: (
    interaction: CommandInteraction | (CommandInteraction & { client: Botrucho }),
    guildDB: IGuildData
  ) => Promise<never>;
  /** Category the command belongs to (optional) */
  cat?: string;
  /** Required bot permissions (optional) */
  botpermissions?: string[];
}
