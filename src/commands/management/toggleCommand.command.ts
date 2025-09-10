import {
  EmbedBuilder,
  GuildMember,
  inlineCode,
  MessageFlags,
  Role,
  SlashCommandBooleanOption,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandStringOption
} from 'discord.js';
import { IGuildData } from '@/mongodb';
import {
  AutoCompleteInteractionWithClient,
  CommandInteractionWithClient,
  ICommand,
  MiscKeys,
  ToggleCommandKeys,
  TranslationElement
} from '@/types';
import { Error, Success } from '@/utils';

export default class ToggleCommandCommand extends ICommand {
  name = 'toggle-command';
  description = 'Enable or disable a command for this server';
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('toggle-command')
    .setDescription('Enable or disable a command for this server')
    .addStringOption((option: SlashCommandStringOption) =>
      option.setName('command')
        .setDescription('The command to enable/disable')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addBooleanOption((option: SlashCommandBooleanOption) =>
      option.setName('enabled')
        .setDescription('Whether the command should be enabled or disabled')
        .setRequired(true)
    );

  private readonly TEST_ROLE_ID: string = '884962190640160839';
  private readonly BOTS_ROLE_ID: string = '540708709945311243';

  async autocomplete(interaction: AutoCompleteInteractionWithClient): Promise<void> {
    const focusedValue: string = interaction.options.getFocused();
    const choices: string[] = interaction.client.commands.map((cmd: ICommand): string => cmd.name);
    const filtered: string[] = choices.filter((choice: string): boolean => choice.startsWith(focusedValue));
    await interaction.respond(
      filtered.map((choice: string) => ({ name: choice, value: choice })).slice(0, 25)
    );
  }

  async execute(interaction: CommandInteractionWithClient, guildDB: IGuildData): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const {
      ERROR,
      COMMAND_ENABLED,
      COMMAND_DISABLED
    }: TranslationElement<MiscKeys> = interaction.translate('MISC', guildDB.lang);
    const {
      ENABLED,
      DISABLED,
      NOT_FOUND,
      NOT_ALLOWED
    }: TranslationElement<ToggleCommandKeys> = interaction.translate('TOGGLE_COMMAND', guildDB.lang);

    const member: GuildMember | null = interaction.member;
    if (!member || !('roles' in member) || !member.roles.cache.some((role: Role): boolean => [this.TEST_ROLE_ID, this.BOTS_ROLE_ID].includes(role.id))) {
      await interaction.reply({
        content: NOT_ALLOWED,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const commandName: string = interaction.options.getString('command', true);
    const shouldBeEnabled: boolean = interaction.options.getBoolean('enabled', true);

    const command: ICommand | undefined = interaction.client.commands.get(commandName);
    if (!command) {
      const embedError: EmbedBuilder = Error({
        title: ERROR,
        description: NOT_FOUND.replace('${command}', commandName)
      });
      await interaction.editReply({ embeds: [embedError] });
      return;
    }

    if (commandName === this.name && !shouldBeEnabled) {
      const embedError: EmbedBuilder = Error({
        title: ERROR,
        description: NOT_ALLOWED
      });
      await interaction.editReply({ embeds: [embedError] });
      return;
    }

    if (shouldBeEnabled) {
      guildDB.disabledCommands = guildDB.disabledCommands.filter((cmd: string): boolean => cmd !== commandName);

      const embedSuccess: EmbedBuilder = Success({
        title: COMMAND_ENABLED,
        description: ENABLED.replace('${command}', inlineCode(commandName))
      });
      await interaction.editReply({ embeds: [embedSuccess] });
    } else {
      if (!guildDB.disabledCommands.includes(commandName)) {
        guildDB.disabledCommands.push(commandName);
      }

      const embedSuccess: EmbedBuilder = Success({
        title: COMMAND_DISABLED,
        description: DISABLED.replace('${command}', inlineCode(commandName))
      });
      await interaction.editReply({ embeds: [embedSuccess] });
    }
    await guildDB.save();
  };
}
