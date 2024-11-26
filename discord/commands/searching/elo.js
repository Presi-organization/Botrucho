const { AttachmentBuilder } = require("discord.js");
const { Jimp, JimpMime } = require("jimp");
const { SlashCommandBuilder } = require('@discordjs/builders');
const { join } = require("path");
const { getEntriesBySummoner } = require("../../../services/REST/riotAPI");
const { Info, Error, Warning, withFile } = require("../../../util/embedMessage");

const transformQueueType = (queueType) => {
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

const getRankPic = async (rank) => {
    const unranked = (await Jimp.read(join(process.cwd(), `/assets/tft_ranks/${ rank }.png`)));
    return new AttachmentBuilder((await unranked.getBuffer(JimpMime.png)), { name: `${ rank }.png` });
}

module.exports = {
    name: 'tftelo',
    data: new SlashCommandBuilder()
        .setName('tftelo')
        .setDescription('Display info about your TFT elo.')
        .addStringOption(input =>
            input.setName('username')
                .setDescription('Username and tag. \'Username#TAG\'')
                .setRequired(true)),
    async execute(interaction) {
        let username = interaction.options.getString('username');
        await interaction.deferReply();
        let entries = [];
        try {
            entries = await getEntriesBySummoner(username);
        } catch (error) {
            return interaction.editReply(Error({
                title: 'ERROR',
                description: 'I couldn\'t find a summoner.' + error,
            }));
        }

        if (entries.length === 0) {
            const embed = {
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
            }
            return interaction.editReply(withFile(Warning(embed), await getRankPic("UNRANKED")));
        }

        for (const entry of entries) {
            const index = entries.indexOf(entry);
            const embed = withFile(Info({
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
            }), await getRankPic(entry.tier));
            index === 0 ? interaction.editReply(embed) : interaction.followUp(embed);
        }
    }
};
