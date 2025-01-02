import { join } from "path";
import { HorizontalAlign, Jimp, JimpMime, VerticalAlign } from 'jimp';
import { AttachmentBuilder, CommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';

export const name = 'siata';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('siata')
    .setDescription('Siata\'s image')
    .addNumberOption(input => input.setName('circulos')
        .setDescription('Cantidad de circulos (zoom) a mostrar')
        .addChoices({ name: 'One Circle', value: 1 })
    );

interface ImageCenter {
    x: number;
    y: number;
}

interface CropInfo extends ImageCenter {
    width: number;
    height: number;
}

export async function execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    await interaction.deferReply();

    const circles: number = interaction.options.getNumber('circulos') ?? 1;

    try {
        const mapCenter: ImageCenter = { x: 1012, y: 680 };
        const radarCenter: ImageCenter = { x: 480, y: 503 };
        const mapInfo = await getCropInfo(630, 630, mapCenter, circles);
        const radarInfo = await getCropInfo(200, 200, radarCenter, circles);

        const mapImage = await Jimp.read(join(process.cwd(), "/assets/map.png"));
        const radarImage = await Jimp.read("https://siata.gov.co/kml/00_Radar/Ultimo_Barrido/AreaMetRadar_10_120_DBZH.png");

        const mapCropped = await getCroppedImage(mapImage, mapInfo);
        const radarCropped = await getCroppedImage(radarImage, radarInfo);

        const outputSize = 1000;
        mapCropped.resize({ w: outputSize, h: outputSize });
        radarCropped.resize({ w: outputSize, h: outputSize }).opacity(0.5);

        mapCropped.composite(radarCropped, HorizontalAlign.CENTER, VerticalAlign.MIDDLE);

        const imageBuffer = await mapCropped.getBuffer(JimpMime.jpeg);
        const attachment = new AttachmentBuilder(imageBuffer);

        return interaction.editReply({ content: "Siata", files: [attachment] });
    } catch (error) {
        console.error('Error processing images:', error);
        return interaction.editReply({ content: 'An error occurred while processing the images.' });
    }
}

async function getCropInfo(cropW: number, cropH: number, center: ImageCenter, circles: number): Promise<CropInfo> {
    const proportion = 250;
    return {
        ...center,
        width: cropW + ((circles - 1) * proportion),
        height: cropH + ((circles - 1) * proportion)
    };
}

async function getCroppedImage(image: any, cropInfo: CropInfo) {
    const { x: centerX, y: centerY, width: cropWidth, height: cropHeight } = cropInfo;

    const startX: number = centerX - cropWidth / 2;
    const startY: number = centerY - cropHeight / 2;
    const validStartX: number = Math.max(0, startX);
    const validStartY: number = Math.max(0, startY);
    const maxCropWidth: number = Math.min(cropWidth, image.bitmap.width - validStartX);
    const maxCropHeight: number = Math.min(cropHeight, image.bitmap.height - validStartY);

    return image.crop({ x: validStartX, y: validStartY, w: maxCropWidth, h: maxCropHeight });
}
