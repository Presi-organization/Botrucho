import { AttachmentBuilder, CommandInteraction, MessageFlags } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';
import { join } from "path";
import { HorizontalAlign, Jimp, JimpMime, VerticalAlign } from 'jimp';

export const name = 'siata';
export const data = new SlashCommandBuilder()
    .setName('siata')
    .setDescription('Siata\'s image');

export async function execute(interaction: CommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const map = (await Jimp.read(join(process.cwd(), "/assets/map.png"))).resize({ w: 991, h: 991 });
    const rain = (await Jimp.read("https://siata.gov.co/kml/00_Radar/Ultimo_Barrido/AreaMetRadar_10_120_DBZH.png")).resize({
        w: 991,
        h: 991
    });
    map.composite(rain, HorizontalAlign.CENTER, VerticalAlign.MIDDLE);
    const image = await map.getBuffer(JimpMime.jpeg);
    const attachment = new AttachmentBuilder(image);
    return interaction.editReply({ content: "Siata", files: [attachment] });
}
