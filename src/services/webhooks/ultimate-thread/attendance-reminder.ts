import { GuildMember, Role, TextChannel, TextThreadChannel } from 'discord.js';

import { Botrucho, IAttendee } from '@/mongodb';
import { logger, Warning } from '@/utils';

import { ATTENDANCE_CHANNEL_ID, FRISBEE_ROLE_ID } from './constants';
import { getTomorrowsDay } from './event-dates';

export const sendReminderToConfirmAttendance = async (client: Botrucho) => {
  const channel = (await client.channels.fetch(ATTENDANCE_CHANNEL_ID)) as TextChannel | null;
  const userIdToAvoid = ['772690171228848131', '175677535537987584', '359010137404342272'];
  if (channel?.isTextBased()) {
    const {
      thread: { threadId },
      messageId,
    } = await client.eventAttendanceData.getEventAttendance({});
    const attendees = await client.eventAttendanceData.getAttendees(messageId);
    const thread: TextThreadChannel | null = await channel.threads.fetch(threadId);
    const users: string[] | undefined = channel.guild.roles.cache
      .find((role: Role) => role.id === FRISBEE_ROLE_ID)
      ?.members.reduce(
        (acc: string[], m: GuildMember) => (!m.user.bot ? [...acc, m.user.id] : acc),
        [],
      );
    const usersNotInAttendees: string[] =
      users?.filter(
        (userId: string) =>
          !attendees.some((attendee: IAttendee) => attendee.userId === userId) &&
          !userIdToAvoid.includes(userId),
      ) || [];
    if (thread && usersNotInAttendees.length > 0) {
      const userMentions = usersNotInAttendees.map((userId) => `<@${userId}>`).join(', ');

      const reminderEmbed = Warning({
        title: '⚠️ Recordatorio de Asistencia',
        description: `Por favor confirma tu asistencia para el evento del ${getTomorrowsDay()}`,
        fields: [
          {
            name: '¿Cómo confirmar?',
            value: '¡Reacciona al mensaje de asistencia!',
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Botrucho Frisbee',
        },
      });

      await thread.send({
        content: userMentions,
        embeds: [reminderEmbed],
      });

      logger.log(`Reminder sent to ${usersNotInAttendees.length} users`);
    }
  }
};
