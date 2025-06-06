import {
  CommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';
import { Botrucho, IGuildData } from '@/mongodb';

export abstract class ICommand {
  /** Command name identifier */
  abstract name: string;
  /** Description of what the command does */
  abstract description: string;
  /** SlashCommand builder defining command structure */
  abstract data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;

  /** Function that handles the command logic */
  abstract execute(interaction: CommandInteraction | (CommandInteraction & {
    client: Botrucho
  }), guildDB: IGuildData): Promise<void>;

  /** Category the command belongs to (optional) */
  cat?: string;
  /** Required bot permissions (optional) */
  botpermissions?: string[];
}
