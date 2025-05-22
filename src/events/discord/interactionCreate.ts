import { Guild, Interaction, InteractionCallbackResponse, Message } from 'discord.js';
import { Botrucho, IGuildData } from '@/mongodb';
import { Command, EventKeys, MiscKeys, TranslationElement } from '@/types';
import { logger } from '@/utils';

module.exports = {
  async execute(client: Botrucho, interaction: Interaction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const guildDB: IGuildData = await interaction.guild.fetchDB(client.guildData);
    if (interaction.isCommand()) {
      const command: Command | undefined = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await client.player.context.provide({ guild: interaction?.guild as Guild }, async () => await command.execute(interaction, guildDB));
      } catch (error) {
        logger.error(error);
        const { ERROR }: TranslationElement<MiscKeys> = interaction.translate('MISC', guildDB.lang);
        await interaction.editReply({
          content: ERROR
        });
      }
    }
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'event-modal') {
        const {
          EVENT_CREATED,
          ASSISTANCE_CONFIRMATION
        }: TranslationElement<EventKeys> = interaction.translate('EVENT', guildDB.lang);
        const eventName: string = interaction.fields.getTextInputValue('eventNameInput');
        const eventDate: string = interaction.fields.getTextInputValue('eventDateInput');
        const eventTime: string = interaction.fields.getTextInputValue('eventTimeInput');
        const eventTimeEval: RegExpExecArray | null = /^(([0-1][0-9]|2[0-3]):([0-5][0-9]))(\s?)-(\s?)(([0-1][0-9]|2[0-3]):([0-5][0-9]))$/.exec(eventTime);
        const eventTimeEvalLength: number | undefined = eventTimeEval?.length;
        let calendarDate = `${eventDate}/${eventDate}`;

        if (eventTimeEval && eventTimeEvalLength && parseInt(eventTimeEval[eventTimeEvalLength - 2]) > parseInt(eventTimeEval[2])) {
          calendarDate = `${eventDate}T${eventTimeEval[2]}${eventTimeEval[3]}00/${eventDate}T${eventTimeEval[eventTimeEvalLength - 2]}${eventTimeEval[eventTimeEvalLength - 1]}00`;
        }

        const eventDescription: string = interaction.fields.getTextInputValue('eventDescriptionInput');
        const eventZone: string = interaction.fields.getTextInputValue('eventLinkInput');
        const addToCalendar = `https://calendar.google.com/calendar/r/eventedit?text=${eventName}&dates=${calendarDate}&details=<b>Descripción+del+evento</b>:+${eventDescription}&location=${eventZone}`;
        interaction.reply({
          embeds: [{
            author: {
              name: EVENT_CREATED.replace('${user}', interaction.user.tag),
              icon_url: interaction.user.displayAvatarURL()
            },
            description: ASSISTANCE_CONFIRMATION.replace('${eventName}', eventName),
            color: 0xF5B719,
          }],
          withResponse: true
        }).then(async (interactionCB: InteractionCallbackResponse) => {
          if (interactionCB.resource?.message) {
            const message: Message<boolean> = interactionCB.resource.message;
            await message.react('👽');
            await message.react('🙅🏻');
            await interaction.guild?.addEventDB(client.eventData, message.id, eventName, encodeURI(addToCalendar.replace(/ /g, '+')));
          }
        });

      }
    }
  }
};
