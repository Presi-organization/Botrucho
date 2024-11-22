const { AttachmentBuilder } = require("discord.js");
const { SlashCommandBuilder } = require('@discordjs/builders');
const { join } = require("path");
const { Jimp, JimpMime, HorizontalAlign, VerticalAlign } = require('jimp');

module.exports = {
    name: 'siata',
    data: new SlashCommandBuilder()
        .setName('siata')
        .setDescription('Siata\'s image'),
    async execute(interaction) {
        await interaction.deferReply();

        const map = (await Jimp.read(join(process.cwd(), "/assets/map.png"))).resize({ w: 991, h: 991 });
        const rain = (await Jimp.read("https://siata.gov.co/kml/00_Radar/Ultimo_Barrido/AreaMetRadar_10_120_DBZH.png")).resize({
            w: 991,
            h: 991
        });
        map.composite(rain, HorizontalAlign.CENTER, VerticalAlign.MIDDLE);
        const image = await map.getBuffer(JimpMime.jpeg);
        const attachment = new AttachmentBuilder(image);
        return interaction.editReply({ content: "Siata", files: [attachment], ephemeral: true });
    },
};
