import { ThreadAutoArchiveDuration } from 'discord-api-types/v10';
import {
  APIMessage,
  GuildMember,
  Message,
  PublicThreadChannel,
  Role,
  TextChannel,
  WebhookClient,
} from 'discord.js';

import { EventAlreadyExistsError } from '@/errors';
import {
  AttendanceDataController,
  Botrucho,
  CronDataController,
  ICronData,
  IEventAttendance,
  IThread,
} from '@/mongodb';
import { logger } from '@/utils';

import { ATTENDANCE_CHANNEL_ID, FRISBEE_ROLE_ID } from './constants';
import { getEventDates, getTomorrowsDay } from './event-dates';
import { sendMessageWithWebhook } from './webhook';

const sendAMessageAndThread = async (
  channel: TextChannel,
  webhook: WebhookClient,
  attendanceData: AttendanceDataController,
  cronData: CronDataController,
): Promise<void> => {
  try {
    const cronId = '8ff357d5-4463-488f-90f4-7ec016457b8e';
    const ultimateData: ICronData | null = await cronData.getCronById(cronId);
    const title = ultimateData?.metadata?.title;
    const webhookTitle =
      typeof title === 'string' && title.length > 0
        ? title.replace('${date}', getTomorrowsDay())
        : `<@&${FRISBEE_ROLE_ID}>\n<a:WEEWOO:1329263115530928208> Asistencia ${getTomorrowsDay()} <a:frisbeeT:1309633549967556619> <a:WEEWOO:1329263115530928208>`;
    const emojis: string[] = [
      (ultimateData?.metadata?.emojiYes as string) || '<:pepe_si:1332572265677586572>',
      (ultimateData?.metadata?.emojiNo as string) || '<:pepe_no:1332572291317502014>',
    ];

    const message: APIMessage = await sendMessageWithWebhook(webhook, webhookTitle);
    const fetchedMessage: Message<true> = await channel.messages.fetch(message.id);
    await Promise.all(emojis.map((emoji: string) => fetchedMessage.react(emoji)));

    const thread: PublicThreadChannel<false> = await fetchedMessage.startThread({
      name: `Asistencia ${getTomorrowsDay()}`,
      autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays,
      reason: 'Diskito en la U',
    });

    const { eventDate, expirationDate } = getEventDates();
    const threadObj: IThread = { threadId: thread.id };
    await attendanceData
      .createEvent(message.id, threadObj, eventDate, expirationDate)
      .then(async (event: IEventAttendance) => {
        const msg: Message<true> = await thread.send({
          content: `<@&${FRISBEE_ROLE_ID}>`,
        });
        setTimeout(() => {
          void msg
            .delete()
            .catch((error) => logger.error('Temporary message cleanup failed', error));
        }, 10);
        const threadMessage: Message<true> = await thread.send({ content: '**Sin Votos**' });
        await thread.send({ content: '__**Logs de Asistencia**__\n' });
        event.thread.countMessageId = threadMessage.id;
        await event.save();

        logger.log(`Event created with message ID: ${message.id} and thread ID: ${thread.id}`);
      })
      .catch(async (error: EventAlreadyExistsError) => {
        logger.error('Error creating event: ', error.message);

        await Promise.allSettled([fetchedMessage.delete(), thread.delete()]);
      });
  } catch (error) {
    logger.trace('Error trying to send: ', error);
  }
};

export const initializeFrisbeeEventCron = async (client: Botrucho) => {
  const webhook = new WebhookClient(client.config.frisbeeHook);

  const channel = (await client.channels.fetch(ATTENDANCE_CHANNEL_ID)) as TextChannel | null;
  if (channel?.isTextBased()) {
    const users: string[] | undefined = channel.guild.roles.cache
      .find((role: Role) => role.id === FRISBEE_ROLE_ID)
      ?.members.reduce(
        (acc: string[], m: GuildMember) => (!m.user.bot ? [...acc, m.user.displayName] : acc),
        [],
      );
    logger.log(users);
    return sendAMessageAndThread(channel, webhook, client.eventAttendanceData, client.cronData);
  }
};
