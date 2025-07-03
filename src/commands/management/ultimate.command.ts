import { Botrucho, IGuildData } from '@/mongodb';
import { ICommand } from '@/types';
import {
  ActionRowBuilder,
  CommandInteraction,
  ModalBuilder,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

export default class UltimateCommand extends ICommand {
  name = 'ultimate';
  description = 'Manage ultimate frisbee events and threads.';
  data: SlashCommandSubcommandsOnlyBuilder = new SlashCommandBuilder()
    .setName('ultimate')
    .setDescription('Manage ultimate frisbee events and threads.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new ultimate frisbee event.'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('Edit an existing ultimate frisbee event.'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('destroy')
        .setDescription('Destroy an ultimate frisbee event.')
        .addStringOption(input => input
          .setName('event_id')
          .setDescription('The ID of the event to destroy.')
          .setRequired(true)
        ))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all upcoming ultimate frisbee events.'));

  async execute(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const { ERROR } = interaction.translate('ULTIMATE', guildDB.lang);

    await interaction.deferReply();
    throw new Error(ERROR);
    /*
    if (!interaction.isChatInputCommand()) return;

    const subcommand: string = interaction.options.getSubcommand();
    switch (subcommand) {
      case 'create':
        return this.createEvent(interaction, guildDB);
      case 'edit':
        return this.editEvent(interaction, guildDB);
      case 'destroy':
        return this.destroyEvent(interaction, guildDB);
      case 'list':
        return this.listEvents(interaction, guildDB);
      default:
        await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
    }
     */
  }


  //TODO: **ultimate create** will create a new ultimate frisbee event -> Store it in the database channel, cronjob, message, reactions, etc.
  // This will use a modal to collect information about the event, such as name, date, time, description, and location.
  private async createEvent(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData): Promise<void> {
    const { MODAL } = interaction.translate('ULTIMATE', guildDB.lang);

    const modal: ModalBuilder = new ModalBuilder()
      .setCustomId('event-modal')
      .setTitle(MODAL);

    const eventNameInput: TextInputBuilder = new TextInputBuilder()
      .setCustomId('eventNameInput')
      .setLabel('Event Name')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const eventCronInput: TextInputBuilder = new TextInputBuilder()
      .setCustomId('eventCronInput')
      .setLabel('Event Cron Expression')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('0 0 * * *'); // Default cron expression for daily events

    const firstActionRow: ActionRowBuilder<TextInputBuilder> = new ActionRowBuilder<TextInputBuilder>().addComponents(eventNameInput);
    const secondActionRow: ActionRowBuilder<TextInputBuilder> = new ActionRowBuilder<TextInputBuilder>().addComponents(eventCronInput);

    modal.addComponents(firstActionRow, secondActionRow);

    await interaction.showModal(modal);
  }

  //TODO: **ultimate edit** will edit an existing ultimate frisbee event -> Update any field in the database related to the event.
  // This will use options.
  private editEvent(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData): Promise<void> {

  }

  //TODO: **ultimate destroy** will destroy an ultimate frisbee event -> Remove an event from the database.
  // This will use options to select the event to destroy.
  private destroyEvent(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData): Promise<void> {

  }

  //TODO: **ultimate list** will list all upcoming ultimate frisbee events -> Fetch all events from the database and display them in a message.
  private listEvents(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData): Promise<void> {

  }
}
