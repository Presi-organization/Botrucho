import {
  bold,
  EmbedBuilder,
  GuildMember,
  hyperlink,
  italic,
  Message, TextChannel,
  underline,
  VoiceBasedChannel,
  VoiceState
} from 'discord.js';
import { Player, QueueRepeatMode, useMainPlayer } from "discord-player";
import { AudioResource, createAudioResource } from "discord-voip";
import { Botrucho, IGuildData } from '@/mongodb';
import { deleteMessagesFromChannel, Info, logger } from '@/utils';
import { join } from "path";
import { PlayerKeys, TranslationElement, TranslationsType } from "@/types";
import en from '@languages/en.json';
import es from '@languages/es.json';

const CLAN_URL = 'https://link.clashroyale.com/invite/clan/es?tag=G8RUCYP2&token=pnpn4nxp&platform=android';

const targetUserIds: string[] = ['429375441267195924', '172127628290031625', '359010137404342272', '175677535537987584']; // Yo, Zapal, Lucho, Dansa

const _sendClanInvitationDM = async (client: Botrucho, member: GuildMember | null): Promise<void> => {
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
      const dmChannelId = message?.channelId;
      if (dmChannelId) setTimeout(async () => await deleteMessagesFromChannel(client, dmChannelId), 180_000);
    } catch (error) {
      logger.error(`Could not send DM to user ${member?.displayName}`, error);
    }
  }
};

const _sendClanInvitationAudioChannel = async (client: Botrucho, member: GuildMember | null): Promise<void> => {
  const isTargetUser = Boolean(member?.id && targetUserIds.includes(member?.id));
  const guild = member?.guild;
  let channel: VoiceBasedChannel | null | undefined = member?.voice.channel;
  const guildDB: IGuildData | null = guild?.id ? await client.guildData.showGuild(guild.id) : null;
  const defaultChannelId: string | null | undefined = guildDB?.defaultSpamChannelID;
  const textChannel: TextChannel | null | undefined = defaultChannelId ? guild?.channels.cache.get(defaultChannelId) as TextChannel : null;
  if (isTargetUser && channel?.isVoiceBased) {
    const player: Player = useMainPlayer();
    const audioFile: string = join(__dirname, '../../../assets/voice/audio_clanV3.mp3');
    try {
      const resource: AudioResource = createAudioResource(audioFile, { metadata: { title: 'M-19 Clan Invitation' } });
      if (!player.nodes.has(channel.guild.id)) {
        const { track } = await player.play(channel, resource, {
          nodeOptions: {
            metadata: {
              channel: textChannel,
              queueMessage: null,
              currentTrack: undefined,
              queueTitles: [],
              message: {
                guild,
                translate: (text: keyof TranslationsType, guildDBLang = 'en'): TranslationElement<string> => {
                  const languages: Record<string, TranslationsType> = { en, es };
                  if (!text || !languages[guildDBLang] || !languages[guildDBLang][text]) {
                    return {} as TranslationElement<PlayerKeys>;
                  }
                  const translation = languages[guildDBLang][text];
                  if (typeof translation === 'object') {
                    return translation as TranslationElement<PlayerKeys>;
                  }
                  return {} as TranslationElement<PlayerKeys>;
                }
              } as unknown as Message,
            },
            volume: 100,
            repeatMode: QueueRepeatMode.OFF,
            noEmitInsert: true,
            leaveOnStop: false,
            leaveOnEmpty: true,
            leaveOnEmptyCooldown: 30000,
            leaveOnEnd: true,
            leaveOnEndCooldown: 30000,
            pauseOnEmpty: true,
            preferBridgedMetadata: true,
            disableBiquad: true
          },
          requestedBy: member?.user,
          connectionOptions: {
            deaf: true,
          }
        });
        if (track.hasResource) {
          track.setResource(null);
        }
      }
    } catch {

    }
  }
}

export const execute = async (client: Botrucho, oldState: VoiceState, newState: VoiceState) => {
  if (!newState.channel?.id) {
    logger.debug(`user ${oldState.member?.displayName} left channel ${oldState.channel?.name}`);
  } else if (!oldState.channel?.id) {
    logger.debug(`user ${newState.member?.displayName} joined channel ${newState.channel?.name}`);
    await _sendClanInvitationAudioChannel(client, newState.member);
    setTimeout(async () => await _sendClanInvitationDM(client, newState.member), 20_000); // wait 20 seconds before sending the DM
  } else {
    logger.debug(`user ${newState.member?.displayName} moved channels ${oldState.channel?.name} ${newState.channel?.name}`);
  }
};
