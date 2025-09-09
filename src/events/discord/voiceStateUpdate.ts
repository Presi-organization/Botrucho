import { bold, EmbedBuilder, GuildMember, hyperlink, italic, Message, underline, VoiceState } from 'discord.js';
import { Botrucho } from '@/mongodb';
import { Info, logger } from '@/utils';

const CLAN_URL = 'https://link.clashroyale.com/invite/clan/es?tag=G8RUCYP2&token=z2bwm83n&platform=android';

const _sendClanInvitationDM = async (client: Botrucho, member: GuildMember | null): Promise<void> => {
  const targetUserIds: string[] = ['691317296559554601', '246804706536456193', '172127628290031625', '175677535537987584', '352618665276997632', '429375441267195924']; // Migue, Nitro, Zapal, Dansa, Ótalvaro, yo
  const isTargetUser = Boolean(member?.id && targetUserIds.includes(member?.id));
  const canSendDM = Boolean(member?.user?.dmChannel || member?.user?.createDM);
  if (isTargetUser && canSendDM) {
    try {
      const JIJIJIJA = '1411006816695095366';
      const embed: EmbedBuilder = Info({
        author: {
          name: 'M-19 Clan',
          iconURL: `https://cdn.discordapp.com/emojis/${JIJIJIJA}`,
          url: CLAN_URL
        },
        title: `${italic(member?.displayName ?? 'Oe')} ${bold('¡Te necesitamos en el clan!')}`,
        description: `No es una amenaza, es una invitación 🐭\n\n${hyperlink(`👉🏻 ${bold(underline('¡Click aquí!'))}`, `${CLAN_URL} 'M-19 Clan'`)}`,
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
      const message: Message<false> | undefined = await member?.send({ embeds: [embed] });
      if (message) setTimeout(() => client.deleted_messages.add(message), 180_000);
    } catch (error) {
      logger.error(`Could not send DM to user ${member?.displayName}`, error);
    }
  }
};

export const execute = async (client: Botrucho, oldState: VoiceState, newState: VoiceState) => {
  if (!newState.channel?.id) {
    logger.debug(`user ${oldState.member?.displayName} left channel ${oldState.channel?.name}`);
  } else if (!oldState.channel?.id) {
    logger.debug(`user ${newState.member?.displayName} joined channel ${newState.channel?.name}`);
    await _sendClanInvitationDM(client, newState.member);
  } else {
    logger.debug(`user ${newState.member?.displayName} moved channels ${oldState.channel?.name} ${newState.channel?.name}`);
  }
};
