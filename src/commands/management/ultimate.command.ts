import { Botrucho, ICronData, IGuildData } from '@/mongodb';
import { ICommand } from '@/types';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  InteractionCallbackResponse,
  InteractionCollector,
  MappedInteractionTypes,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
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

    await interaction.reply({ content: 'This command is under construction.', flags: MessageFlags.Ephemeral });
    return;

    const cronJob: ICronData | null = await interaction.client.cronData.getCronById('8ff357d5-4463-488f-90f4-7ec016457b8e');
    if (!cronJob) {
      await interaction.reply({ content: 'Cron job not found.', flags: MessageFlags.Ephemeral });
      return;
    }

    const subcommand: string = interaction.options.getSubcommand();
    switch (subcommand) {
      case 'edit':
        return this.editEvent(interaction, guildDB, cronJob);
      case 'list':
        return this.listEvents(interaction, guildDB);
      default:
        await interaction.reply({ content: 'Unknown subcommand', flags: MessageFlags.Ephemeral });
    }
  }

  private async editEvent(interaction: CommandInteraction & {
    client: Botrucho
  }, guildDB: IGuildData, cronJob: ICronData): Promise<void> {
    const { MODAL } = interaction.translate('ULTIMATE', guildDB.lang);

    const select: StringSelectMenuBuilder = new StringSelectMenuBuilder()
      .setCustomId('ultimate-edit-select')
      .setPlaceholder('Select an option to edit')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Title')
          .setDescription('The title of the event.')
          .setValue('title'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Cron Expression')
          .setDescription('The cron expression for the event.')
          .setValue('regexpcron'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Emojis')
          .setDescription('The emojis for the event.')
          .setValue('emojis'),
      );

    const row: ActionRowBuilder<StringSelectMenuBuilder> = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(select);

    const response: InteractionCallbackResponse = await interaction.reply({
      content: 'Choose an option to edit the ultimate frisbee event:',
      components: [row],
      flags: MessageFlags.Ephemeral,
      withResponse: true,
    });

    try {
      const collector: InteractionCollector<MappedInteractionTypes[ComponentType.StringSelect]> | undefined = response.resource?.message?.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 3_600_000 // 1 hour
      });

      collector?.on('collect', async i => {
        switch (i.values[0]) {
          case 'title': {
            const titleModal: ModalBuilder = new ModalBuilder()
              .setCustomId('edit-title-modal')
              .setTitle('Edit Event Title')
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('editTitleInput')
                    .setLabel('New Title')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                )
              );

            await i.showModal(titleModal);
            break;
          }

          case 'regexpcron': {
            const buildCronModal: () => ModalBuilder = (): ModalBuilder =>
              new ModalBuilder()
                .setCustomId('edit-cron-modal')
                .setTitle('Edit Cron Expression')
                .addComponents(
                  new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                      .setCustomId('editCronInput')
                      .setLabel('New Cron Expression')
                      .setStyle(TextInputStyle.Short)
                      .setRequired(true)
                      .setPlaceholder('0 0 * * *')
                  )
                );

            let valid = false;
            while (!valid) {
              const cronModal: ModalBuilder = buildCronModal();
              await i.showModal(cronModal);

              try {
                const modal_collected: ModalSubmitInteraction = await interaction.awaitModalSubmit({
                  filter: (m: ModalSubmitInteraction): boolean => m.customId === 'edit-cron-modal',
                  time: 60_000 // 5 minutes
                });
                const cronRegex = /^(\*|([0-5]?\d)) (\*|([01]?\d|2[0-3])) (\*|([1-9]|[12]\d|3[01])) (\*|(0?[1-9]|1[0-2])) (\*|[0-6])$/;
                const newCron: string = modal_collected.fields.getTextInputValue('editCronInput');
                if (cronRegex.test(newCron)) {
                  valid = true;

                  // Persist here (example — replace with your repo/service call)
                  await interaction.client.cronData.createOrUpdateCron({
                    ...cronJob,
                    cronExpression: newCron, isActive: true
                  });

                  await modal_collected.reply({
                    content: `Cron expression updated to: \`${newCron}\``,
                    flags: MessageFlags.Ephemeral
                  });
                } else {
                  const retryButton: ButtonBuilder = new ButtonBuilder()
                    .setCustomId('retry-cron-modal')
                    .setLabel('Try Again')
                    .setStyle(ButtonStyle.Primary);

                  const row: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>().addComponents(retryButton);

                  const invalidResponse = await modal_collected.reply({
                    content: 'Invalid cron expression. Please use the format: `* * * * *`',
                    components: [row],
                    flags: MessageFlags.Ephemeral,
                    withResponse: true
                  });

                  const retryCollector: InteractionCollector<MappedInteractionTypes[ComponentType.Button]> | undefined = invalidResponse.resource?.message?.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 60_000
                  });
                  await new Promise<void>((resolve) => {
                    retryCollector?.once('collect', async (btnI) => {
                      await btnI.deferUpdate();
                      resolve();
                    });
                    retryCollector?.once('end', () => resolve());
                  });
                }
              } catch (error) {
                valid = true;
                await i.followUp({
                  content: 'Modal submission timed out. The modal has been closed',
                  flags: MessageFlags.Ephemeral
                });
                break;
              }
            }
            break;
          }

          case 'emojis':
            // Handle emojis editing here
            await i.reply({ content: 'Emojis editing is not implemented yet.', ephemeral: true });
            break;

          default:
            await i.reply({ content: 'Unknown selection.', ephemeral: true });

        }
      });
      collector?.once('end', async () => {
        try {
          await interaction.deleteReply();
        } catch {
          try {
            await interaction.editReply({ content: 'Session ended.', components: [] });
          } catch {/**/
          }
        }
      });
    } catch {
      await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
    }
  }

  //TODO: **ultimate list** will list all upcoming ultimate frisbee events -> Fetch all events from the database and display them in a message.
  private listEvents(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData): Promise<void> {/**/
  }
}
