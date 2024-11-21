const { SlashCommandBuilder } = require('@discordjs/builders');
const { Jimp, JimpMime, HorizontalAlign, VerticalAlign } = require('jimp');
const { join } = require("path");
const { AttachmentBuilder } = require("discord.js");

module.exports = {
    name: 'clima',
    data: new SlashCommandBuilder()
        .setName('clima')
        .setDescription('Imagen del clima'),
    async execute(interaction) {
        await interaction.deferReply();

        const mapa = (await Jimp.read(join(__dirname, "mapa.png"))).resize({ w: 991, h: 991 });
        const rain = (await Jimp.read("https://siata.gov.co/kml/00_Radar/Ultimo_Barrido/AreaMetRadar_10_120_DBZH.png")).resize({
            w: 991,
            h: 991
        });
        mapa.composite(rain, HorizontalAlign.CENTER, VerticalAlign.MIDDLE);
        const image = await mapa.getBuffer(JimpMime.jpeg);
        const attachment = new AttachmentBuilder(image);
        return interaction.editReply({ content: "Siata", files: [attachment], ephemeral: true });
    },
};
