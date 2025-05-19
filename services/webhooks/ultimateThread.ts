import {
  WebhookClient,
  BaseInteraction,
  TextChannel,
  APIMessage,
  Message,
  PublicThreadChannel,
  Collection,
  User,
  TextThreadChannel
} from 'discord.js';
import { Snowflake, ThreadAutoArchiveDuration } from "discord-api-types/v10";
import EventAttendanceData from "@mongodb/controllers/EventAttendanceData";
import { EventAlreadyExistsError } from "@errors/EventAlreadyExistsError";
import Botrucho from "@mongodb/base/Botrucho";
import AttendanceReactionHandler from "@events/discord/reactionHandlers/AttendanceReactionHandler";
import { IEventAttendance, IThread } from "@mongodb/models/EventAttendanceData";
import { logger } from '@util/Logger';

/**
 * Retrieves the current Date + one day and + three days
 * @return { eventDate: Date, expirationDate: Date } The event and expiration dates
 */
const getEventDates = (): { eventDate: Date, expirationDate: Date } => {
  const eventDate = new Date();
  eventDate.setHours(0, 0, 0, 0);
  eventDate.setDate(eventDate.getDate() + 2);

  const expirationDate = new Date();
  expirationDate.setHours(0, 0, 0, 0);
  expirationDate.setDate(expirationDate.getDate() + 15 + 3);

  return { eventDate, expirationDate };
}

/**
 * Retrieves the current Date + one day
 * @return string The formatted date (dd/mm/yyyy)
 */
const getTomorrowsDay: () => string = (): string => {
  const { eventDate } = getEventDates();
  return eventDate.toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Create a new webhook
 * @arg {BaseInteraction} interaction The interaction object
 */
const createWebhook: (interaction: BaseInteraction) => Promise<void> = async (interaction: BaseInteraction): Promise<void> => {
  (interaction.channel as TextChannel).createWebhook({
    name: 'Botruchook',
    avatar: 'https://images.deepai.org/art-image/5c017be32cb74260aa1471f36d539b9c/ultimate-frisbee-profile-image-86efab.jpg'
  })
    .then(webhook => logger.log(`Created webhook ${webhook}\n ${webhook.url}`))
    .catch(logger.error);
}

/**
 * Edit an existing webhook
 * @arg {WebhookClient} webhook The Webhook client
 */
const editWebhook: (webhook: WebhookClient) => Promise<WebhookClient> = (webhook: WebhookClient): Promise<WebhookClient> => {
  return webhook.edit({
    name: 'Botruchook',
    avatar: 'https://images.deepai.org/art-image/5c017be32cb74260aa1471f36d539b9c/ultimate-frisbee-profile-image-86efab.jpg'
  });
}

const handleReactions = async (client: Botrucho, message: Message<true>): Promise<void> => {
  const attendanceReactionHandler: AttendanceReactionHandler = new AttendanceReactionHandler(client);
  for (const reaction of message.reactions.cache.values()) {
    const users: Collection<Snowflake, User> = await reaction.users.fetch();
    users.forEach((user: User) => {
      if (user.id !== client.user?.id) {
        attendanceReactionHandler.handleAttendanceReaction(reaction, user);
      }
    });
  }
};

const deleteNonBotMessages = async (client: Botrucho, channel: TextChannel, threadId: string): Promise<void> => {
  const thread: TextThreadChannel | null = await channel.threads.fetch(threadId);
  if (thread) {
    const messages: Collection<string, Message<true>> = await thread.messages.fetch();
    const nonBotMessages: Collection<string, Message<true>> = messages.filter(message => message.author.id !== client.user?.id);

    nonBotMessages.forEach((message: Message<true>) => {
      message.delete();
    });
  }
};

/**
 * Send a message with an existing webhook
 * @arg {WebhookClient} webhook The Webhook client
 */
const sendMessageWithWebhook: (webhook: WebhookClient) => Promise<APIMessage> = (webhook: WebhookClient): Promise<APIMessage> => {
  return webhook.send({
    content: `<@&540708709945311243>\n<a:WEEWOO:1329263115530928208> Asistencia ${getTomorrowsDay()} <a:frisbeeT:1309633549967556619> <a:WEEWOO:1329263115530928208>`
  });
}

const sendAMessageAndThread: (channel: TextChannel, webhook: WebhookClient, attendanceData: EventAttendanceData) => Promise<void> = async (channel: TextChannel, webhook: WebhookClient, attendanceData: EventAttendanceData): Promise<void> => {
  try {
    const message: APIMessage = await sendMessageWithWebhook(webhook);
    const fetchedMessage: Message<true> = await channel.messages.fetch(message.id);
    await Promise.all([
      fetchedMessage.react('<:pepe_si:1332572265677586572>'),
      fetchedMessage.react('<:pepe_no:1332572291317502014>')
    ]);

    const thread: PublicThreadChannel<false> = await fetchedMessage.startThread({
      name: `Asistencia ${getTomorrowsDay()}`,
      autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays,
      reason: 'Diskito en la U'
    });

    const { eventDate, expirationDate } = getEventDates();
    const threadObj: IThread = { threadId: thread.id }
    await attendanceData.createEvent(message.id, threadObj, eventDate, expirationDate).then(async (event: IEventAttendance) => {
      const msg: Message<true> = await thread.send({
        content: '<@&540708709945311243>'
      });
      setTimeout(() => msg.delete(), 10);
      const threadMessage: Message<true> = await thread.send({ content: '**Sin Votos**' });
      await thread.send({ content: '__**Logs de Asistencia**__\n' });
      event.thread.countMessageId = threadMessage.id;
      await event.save();

      logger.log(`Event created with message ID: ${message.id} and thread ID: ${thread.id}`);
    }).catch((error: EventAlreadyExistsError) => {
      logger.error('Error creating event: ', error.message);

      fetchedMessage.delete();
      thread.delete();
    });
  } catch (error) {
    logger.trace('Error trying to send: ', error);
  }
}

export { sendAMessageAndThread, createWebhook, editWebhook, handleReactions, deleteNonBotMessages }
