import { join } from "path";
import {
    AttachmentBuilder,
    CommandInteraction,
    EmbedBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandStringOption
} from "discord.js";
import { Jimp, JimpMime } from "jimp";
import { SlashCommandBuilder } from '@discordjs/builders';
import { getEntriesBySummoner } from "@services/REST/riotAPI";
import { Info, Error, Warning, createReplyOptions } from "@util/embedMessage";

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
    const rankImage = (await Jimp.read(join(process.cwd(), `/assets/tft_ranks/${ rank }.png`)));
    return new AttachmentBuilder((await rankImage.getBuffer(JimpMime.png)), { name: `${ rank }.png` });
}

export const name = 'tftelo';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('tftelo')
    .setDescription('Display info about your TFT elo.')
    .addStringOption((input: SlashCommandStringOption) => input.setName('username')
        .setDescription('Username and tag. \'Username#TAG\'')
        .setRequired(true));

export async function execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;
    let username: string = interaction.options.getString('username')!;
    await interaction.deferReply();
    let entries = [];
    try {
        entries = await getEntriesBySummoner(username);
    } catch (error) {
        return interaction.editReply({
            embeds: [Error({
                title: 'ERROR',
                description: 'I couldn\'t find a summoner.' + error,
            })]
        });
    }

    if (entries.length === 0) {
        const embed: EmbedBuilder = Warning({
            title: 'TFT ELO',
            description: 'You\'re probably unranked',
            thumbnail: {
                url: 'attachment://UNRANKED.png'
            },
            timestamp: new Date().toISOString(),
            footer: {
                text: `${ username }`,
                iconURL: 'attachment://UNRANKED.png'
            }
        });
        return interaction.editReply(createReplyOptions(embed, { files: [await getRankPic('UNRANKED')] }));
    }

    for (const entry of entries) {
        const index: number = entries.indexOf(entry);
        const embed = createReplyOptions(Info({
            title: "TFT ELO",
            image: {
                url: `attachment://${ entry.tier }.png`
            },
            fields: [
                {
                    name: "Game Mode",
                    value: transformQueueType(entry.queueType),
                    inline: true
                },
                {
                    name: "Rank/Tier",
                    value: `${ entry.tier } ${ entry.rank } (${ entry.leaguePoints } LP)`,
                    inline: true
                },
                {
                    name: "Wins | Loss",
                    value: `**W:** ${ entry.wins } | **L:** ${ entry.losses }`
                },
                { name: '\u200B', value: '\u200B' },
                {
                    name: "Hot Streak",
                    value: `${ entry.hotStreak ? "Yes" : "No" }`,
                    inline: true
                },
                {
                    name: "Fresh Blood",
                    value: `${ entry.freshBlood ? "Yes" : "No" }`,
                    inline: true
                },
                {
                    name: "Inactive",
                    value: `${ entry.inactive ? "Yes" : "No" }`,
                    inline: true
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: `${ username }`,
                iconURL: `attachment://${ entry.tier }.png`
            }
        }), { files: [await getRankPic(entry.tier)] });
        index === 0 ? await interaction.editReply(embed) : await interaction.followUp(embed);
    }
}
