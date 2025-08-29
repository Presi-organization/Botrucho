import { EmbedBuilder, Message, VoiceState } from 'discord.js';
import { Botrucho } from '@/mongodb';
import { Info, logger } from '@/utils';

export const execute = async (client: Botrucho, oldState: VoiceState, newState: VoiceState) => {
  if (!newState.channel?.id) {
    logger.debug(`user ${oldState.member?.displayName} left channel ${oldState.channel?.name}`);
  } else if (!oldState.channel?.id) {
    logger.debug(`user ${newState.member?.displayName} joined channel ${newState.channel?.name}`);
    const isZapal: boolean = newState.member?.id === '172127628290031625';
    if (isZapal) {
      try {
        const embed: EmbedBuilder = Info({
          title: '👑 **¡Te necesitamos en el clan!**',
          description: '[👉🏻 __**¡Click aquí!**__ No es una amenaza, es una invitación 🐀](https://link.clashroyale.com/invite/clan/es?tag=G8RUCYP2&token=frw63j78&platform=android/ \'M-19 Clan\')',
          footer: {
            text: client.user?.username ?? 'Bot',
            iconURL: client.user?.displayAvatarURL({ size: 512 }) ?? undefined
          }
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
