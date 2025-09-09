import { BaseInteraction, InteractionCallbackResponse, Message } from 'discord.js';
import { IIntCreateHandler } from '@/events/discord/interactionCreateHandlers';
import { Botrucho, IGuildData } from '@/mongodb';
import { EventKeys, TranslationElement } from '@/types';

export class CalendarEventHandler implements IIntCreateHandler {
  private client: Botrucho;
  private guildDB: IGuildData;

  constructor(client: Botrucho, guildDB: IGuildData) {
    this.client = client;
    this.guildDB = guildDB;
  }

  handle = async (interaction: BaseInteraction): Promise<boolean> => {
    if (!interaction.isModalSubmit()) return false;
    if (interaction.customId !== 'event-modal') return false;

    const {
      EVENT_CREATED,
      ASSISTANCE_CONFIRMATION
    }: TranslationElement<EventKeys> = interaction.translate('EVENT', this.guildDB.lang);
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
        await interaction.guild?.addEventDB(this.client.eventData, message.id, eventName, encodeURI(addToCalendar.replace(/ /g, '+')));
      }
    });
    return true;
  }

}
