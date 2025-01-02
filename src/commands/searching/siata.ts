import { join } from "path";
import { HorizontalAlign, Jimp, JimpMime, VerticalAlign } from 'jimp';
import { AttachmentBuilder, CommandInteraction, MessageFlags } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';

export const name = 'siata';
export const data = new SlashCommandBuilder()
    .setName('siata')
    .setDescription('Siata\'s image');

export async function execute(interaction: CommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    async function getCroppedImage(url: string, centerX: number, centerY: number, cropWidth: number, cropHeight: number) {
        const image = await Jimp.read(url);
        const startX = centerX - cropWidth / 2;
        const startY = centerY - cropHeight / 2;
        const validStartX = Math.max(0, startX);
        const validStartY = Math.max(0, startY);
        const maxCropWidth = Math.min(cropWidth, image.bitmap.width - validStartX);
        const maxCropHeight = Math.min(cropHeight, image.bitmap.height - validStartY);
        return image.crop({ x: validStartX, y: validStartY, w: maxCropWidth, h: maxCropHeight });
    }

    const map = await getCroppedImage(join(process.cwd(), "/assets/map.png"), 1012, 680, 620, 620);
    map.resize({ w: 1000, h: 1000 });
    const rain = await getCroppedImage("https://siata.gov.co/kml/00_Radar/Ultimo_Barrido/AreaMetRadar_10_120_DBZH.png", 480, 512, 200, 200);
    rain.resize({ w: 1000, h: 1000 }).opacity(0.50);

    map.composite(rain, HorizontalAlign.CENTER, VerticalAlign.MIDDLE);
    const image = await map.getBuffer(JimpMime.jpeg);
    const attachment = new AttachmentBuilder(image);
    return interaction.editReply({ content: "Siata", files: [attachment] });
}
