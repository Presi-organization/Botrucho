import {
  AutocompleteInteraction,
  CommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';
import { Botrucho, IGuildData } from '@/mongodb';

export type CommandInteractionWithClient = CommandInteraction & { client: Botrucho };
export type AutoCompleteInteractionWithClient = AutocompleteInteraction & { client: Botrucho };

export abstract class ICommand {
  /** Command name identifier */
  abstract name: string;
  /** Description of what the command does */
  abstract description: string;
  /** SlashCommand builder defining command structure */
  abstract data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;

  /** Function that handles the command logic */
  abstract execute(interaction: CommandInteraction | CommandInteractionWithClient, guildDB: IGuildData): Promise<void>;

  /** Function that handles autocomplete interactions (optional) */
  autocomplete?(interaction: AutocompleteInteraction | AutoCompleteInteractionWithClient): Promise<void>;

  /** Category the command belongs to (optional) */
  cat?: string;
  /** Required bot permissions (optional) */
  botpermissions?: string[];
}
