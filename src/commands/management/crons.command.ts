import {
  ActionRowBuilder,
  AutocompleteFocusedOption,
  bold,
  EmbedBuilder,
  GuildMember,
  inlineCode,
  italic,
  MessageFlags,
  Role,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  underline
} from 'discord.js';
import { ICronData, IGuildData } from '@/mongodb';
import {
  AutoCompleteInteractionWithClient,
  CommandInteractionWithClient,
  CronsKeys,
  ICommand,
  TranslationElement
} from '@/types';
import { Error, Success } from '@/utils';

export default class CronsCommand extends ICommand {
  name = 'crons';
  description = 'Manage scheduled events and threads.';
  data: SlashCommandSubcommandsOnlyBuilder = new SlashCommandBuilder()
    .setName('crons')
    .setDescription('Manage scheduled events and threads.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('Edit an existing cron job.'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('destroy')
        .setDescription('Destroy an existing cron job.')
        .addStringOption(input => input
          .setName('cron-id')
          .setDescription('The ID of the cron job to destroy.')
          .setRequired(true)
          .setAutocomplete(true)
        ))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all cron jobs.'));

  private readonly TEST_ROLE_ID: string = '884962190640160839';
  private readonly BOTS_ROLE_ID: string = '540708709945311243';

  async autocomplete(interaction: AutoCompleteInteractionWithClient): Promise<void> {
    const subcommand: string | null = interaction.options.getSubcommand(false);
    if (subcommand !== 'destroy') return;
    const focusedOption: AutocompleteFocusedOption = interaction.options.getFocused(true);
    if (focusedOption.name !== 'cron-id') return;

    const cronJobs: ICronData[] = await interaction.client.cronData.getAllCrones();
    const choices = cronJobs.map((cron: ICronData) => ({
      name: `${cron.isActive ? '🟢' : '🔴'} ${cron.cronName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} │ ${cron.cronExpression} │`,
      value: cron.cronId as string
    }));

    const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toLowerCase()));
    await interaction.respond(
      filtered.slice(0, 25) // Discord allows a maximum of 25 suggestions
    );
  };

  async execute(interaction: CommandInteractionWithClient, guildDB: IGuildData): Promise<void> {
    if (!interaction.isChatInputCommand()) return;
    const { ERROR, UNDER_CONSTRUCTION } = interaction.translate('MISC', guildDB.lang);
    const cronsTranslations: TranslationElement<CronsKeys> = interaction.translate('CRONS', guildDB.lang);

    const member = interaction.member as GuildMember | null;
    if (!member || !('roles' in member) || !member.roles.cache.some((role: Role): boolean => [this.TEST_ROLE_ID, this.BOTS_ROLE_ID].includes(role.id))) {
      await interaction.reply({
        content: UNDER_CONSTRUCTION,
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    const subcommand: string = interaction.options.getSubcommand();
    switch (subcommand) {
      case 'edit':
        return this._showCronSelectMenu(interaction, {
          customId: 'cron-edit-select',
          action: cronsTranslations.ACTION_EDIT,
          translations: cronsTranslations
        });
      case 'list':
        return this._listCronJobs(interaction, cronsTranslations);
      case 'destroy': {
        return this._destroyCronJob(interaction, cronsTranslations);
      }
      default:
        await interaction.reply({ content: ERROR, flags: MessageFlags.Ephemeral });
    }
  };

  private async _showCronSelectMenu(interaction: CommandInteractionWithClient, options: {
    customId: string;
    action: string;
    translations: TranslationElement<CronsKeys>;
  }): Promise<void> {
    const { CRON_JOBS, NOT_FOUND, SELECT_PLACEHOLDER } = options.translations;

    const cronJobs: ICronData[] = await interaction.client.cronData.getAllCrones();
    if (!cronJobs || cronJobs.length === 0) {
      await interaction.reply({ content: NOT_FOUND, flags: MessageFlags.Ephemeral });
      return;
    }

    const selectOptions: StringSelectMenuOptionBuilder[] = cronJobs.map(cron => (
      new StringSelectMenuOptionBuilder({
        label: `${cron.isActive ? '🟢' : '🔴'} ${cron.cronName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} │ ${cron.cronExpression} │`,
        value: cron.cronId as string
      })
    ));

    const select: StringSelectMenuBuilder = new StringSelectMenuBuilder()
      .setCustomId(options.customId)
      .setPlaceholder(SELECT_PLACEHOLDER.replace('${action}', options.action))
      .addOptions(selectOptions);
    const row: ActionRowBuilder<StringSelectMenuBuilder> = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await interaction.reply({
      embeds: [Success({ title: CRON_JOBS })],
      components: [row],
      flags: MessageFlags.Ephemeral
    });
  };

  private async _listCronJobs(interaction: CommandInteractionWithClient, translations: TranslationElement<CronsKeys>): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const { NOT_FOUND, CRON_JOBS } = translations;

    const { client } = interaction;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const cronJobs: ICronData[] = await interaction.client.cronData.getAllCrones();
    if (cronJobs.length === 0) {
      await interaction.editReply({ embeds: [Error({ description: NOT_FOUND })] });
      return;
    }

    const embed: EmbedBuilder = Success({
      title: CRON_JOBS,
      fields: cronJobs.map((cronJob: ICronData) => ({
        name: `${cronJob.isActive ? '🟢' : '🔴'} ${underline(cronJob.cronName)} ${inlineCode(cronJob.cronExpression)}`,
        value: this._formatCronJobDetails(cronJob, translations),
        inline: false
      }))
    })

    await interaction.editReply({ embeds: [embed] });
    setTimeout(() => client.deleted_messages.add(interaction), 10_000); // Delete after 10 seconds
    return;
  };

  private async _destroyCronJob(interaction: CommandInteractionWithClient, translations: TranslationElement<CronsKeys>): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const { DESTROYED, NOT_FOUND } = translations;

    const cronId: string = interaction.options.getString('cron-id', true);
    const cronJob: ICronData | null = await interaction.client.cronData.getCronById(cronId);
    if (!cronJob) {
      await interaction.reply({ content: NOT_FOUND, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.client.cronData.createOrUpdateCron({ ...cronJob, isActive: false });
    await interaction.reply({
      content: DESTROYED.replace('${job}', inlineCode(cronJob.cronName)),
      flags: MessageFlags.Ephemeral
    });
    return;
  };

  private _formatCronJobDetails(cronJob: ICronData, translations: TranslationElement<CronsKeys>): string {
    const { LAST_RUN, NEVER } = translations;

    const metadataSection: string = cronJob.metadata
      ? `${italic(bold('Metadata:'))} ${JSON.stringify(cronJob.metadata, null, 2)}\n`
      : '';
    const lastRunSection = `${italic(bold(LAST_RUN))} ${cronJob.lastRun ? new Date(cronJob.lastRun).toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }) : NEVER}`;

    return `${metadataSection}${lastRunSection}\n`;
  };
}
