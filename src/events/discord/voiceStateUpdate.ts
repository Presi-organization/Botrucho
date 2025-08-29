import { bold, EmbedBuilder, hyperlink, italic, Message, underline, VoiceState } from 'discord.js';
import { Botrucho } from '@/mongodb';
import { Info, logger } from '@/utils';

export const execute = async (client: Botrucho, oldState: VoiceState, newState: VoiceState) => {
  if (!newState.channel?.id) {
    logger.debug(`user ${oldState.member?.displayName} left channel ${oldState.channel?.name}`);
  } else if (!oldState.channel?.id) {
    logger.debug(`user ${newState.member?.displayName} joined channel ${newState.channel?.name}`);
    const targetUserIds: string[] = ['172127628290031625', '238387643342127105', '175677535537987584', '352618665276997632', '429375441267195924']; // Zapal, Aku, Dansa, Ótalvaro, yo
    const isTargetUser = Boolean(newState.member?.id && targetUserIds.includes(newState.member.id));
    if (isTargetUser) {
      try {
        const JIJIJIJA = '1411006816695095366';
        const embed: EmbedBuilder = Info({
          author: {
            name: 'M-19 Clan',
            iconURL: `https://cdn.discordapp.com/emojis/${JIJIJIJA}`,
            url: 'https://link.clashroyale.com/invite/clan/es?tag=G8RUCYP2&token=frw63j78&platform=android/'
          },
          title: `${italic(newState.member?.displayName ?? 'Oe')} ${bold('¡Te necesitamos en el clan!')}`,
          description: `No es una amenaza, es una invitación 🐭\n\n${hyperlink(`👉🏻 ${bold(underline('¡Click aquí!'))}`, 'https://link.clashroyale.com/invite/clan/es?tag=G8RUCYP2&token=frw63j78&platform=android/ \'M-19 Clan\'')}`,
          fields: [{
            name: '¿Por qué unirme?',
            value: '• Participa en guerras de clanes y torneos\n• Comparte estrategias y tu existencia miserable\n• Te damos razones para vivir un día más\n• Aquí tu adicción es vista como dedicación <a:HogButt:1411016698131124357>',
          }],
          thumbnail: {
            url: `https://cdn.discordapp.com/emojis/${JIJIJIJA}`
          },
          footer: {
            text: client.user?.username ?? 'Bot',
            iconURL: client.user?.displayAvatarURL({ size: 512 }) ?? undefined
          },
          timestamp: new Date().toISOString(),
        });
        const message: Message<false> | undefined = await newState.member?.send({ embeds: [embed] });
        if (message) setTimeout(() => client.deleted_messages.add(message), 180_000);
      } catch (error) {
        logger.error(`Could not send DM to user ${newState.member?.displayName}`, error);
      }
    }
  } else {
    logger.debug(`user ${newState.member?.displayName} moved channels ${oldState.channel?.name} ${newState.channel?.name}`);
  }
};
