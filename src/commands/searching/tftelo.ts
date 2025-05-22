import { join } from 'path';
import {
  AttachmentBuilder,
  CommandInteraction,
  EmbedBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandStringOption
} from 'discord.js';
import { Jimp, JimpMime } from 'jimp';
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from '@/mongodb';
import { getEntriesBySummoner } from '@/services';
import { MiscKeys, TftEloKeys, TranslationElement } from '@/types';
import { Error, Info, Warning } from '@/utils';

const transformQueueType = (queueType: string): string => {
  switch (queueType) {
    case 'RANKED_TFT':
      return 'Ranked'
    case 'RANKED_TFT_TURBO':
      return 'HyperRoll'
    case 'RANKED_TFT_DOUBLE_UP':
      return 'Double Up(Workshop)'
    case 'TUTORIAL_TFT':
      return 'Tutorial'
    default:
      return 'Normal'
  }
}

const getRankPic = async (rank: string): Promise<AttachmentBuilder> => {
  const rankImage = (await Jimp.read(join(process.cwd(), `/assets/tft_ranks/${rank}.png`)));
  return new AttachmentBuilder((await rankImage.getBuffer(JimpMime.png)), { name: `${rank}.png` });
}

export const name = 'tftelo';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
  .setName('tftelo')
  .setDescription('Display info about your TFT elo.')
  .addStringOption((input: SlashCommandStringOption) => input.setName('username')
    .setDescription('Username and tag. \'Username#TAG\'')
    .setRequired(true));

export async function execute(interaction: CommandInteraction, guildDB: IGuildData) {
  if (!interaction.isChatInputCommand()) return;

  const { YES, NO }: TranslationElement<MiscKeys> = interaction.translate('MISC', guildDB.lang);
  const {
    ELO,
    SUMMONER_NOT_FOUND,
    UNRANKED,
    GAME_MODE,
    RANK,
    WINS_LOSSES,
    STREAK,
    FRESH_BLOOD,
    INACTIVE
  }: TranslationElement<TftEloKeys> = interaction.translate('TFT_ELO', guildDB.lang);

  const username: string = interaction.options.getString('username', true);
  await interaction.deferReply();
  let entries = [];
  try {
    entries = await getEntriesBySummoner(username);
  } catch (error) {
    return interaction.editReply({
      embeds: [Error({
        title: 'ERROR',
        description: SUMMONER_NOT_FOUND.replace('${error}', String(error))
      })]
    });
  }

  if (entries.length === 0) {
    const embed: EmbedBuilder = Warning({
      title: ELO,
      description: UNRANKED,
      thumbnail: {
        url: 'attachment://UNRANKED.png'
      },
      timestamp: new Date().toISOString(),
      footer: {
        text: `${username}`,
        iconURL: 'attachment://UNRANKED.png'
      }
    });
    return interaction.editReply({ embeds: [embed], files: [await getRankPic('UNRANKED')] });
  }

  for (const entry of entries) {
    const index: number = entries.indexOf(entry);
    const embed = {
      embeds: [Info({
        title: ELO,
        image: {
          url: `attachment://${entry.tier}.png`
        },
        fields: [
          {
            name: GAME_MODE,
            value: transformQueueType(entry.queueType),
            inline: true
          },
          {
            name: RANK,
            value: `${entry.tier} ${entry.rank} (${entry.leaguePoints} LP)`,
            inline: true
          },
          {
            name: WINS_LOSSES,
            value: `**W:** ${entry.wins} | **L:** ${entry.losses}`
          },
          { name: '\u200B', value: '\u200B' },
          {
            name: STREAK,
            value: entry.hotStreak ? YES : NO,
            inline: true
          },
          {
            name: FRESH_BLOOD,
            value: entry.freshBlood ? YES : NO,
            inline: true
          },
          {
            name: INACTIVE,
            value: entry.inactive ? YES : NO,
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: `${username}`,
          iconURL: `attachment://${entry.tier}.png`
        }
      })], files: [await getRankPic(entry.tier)]
    };

    if (index === 0) {
      await interaction.editReply(embed);
    } else {
      await interaction.followUp(embed);
    }
  }
}
