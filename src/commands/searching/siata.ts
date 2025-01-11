import { join } from "path";
import { HorizontalAlign, Jimp, JimpMime, VerticalAlign } from 'jimp';
import { AttachmentBuilder, CommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';
import { Error, Success } from "@util/embedMessage";

export const name = 'siata';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('siata')
    .setDescription('Siata\'s image')
    .addNumberOption(input => input.setName('circles')
        .setDescription('Number of circles (zoom) to display')
        .addChoices({ name: 'One', value: 1 }, { name: 'Two', value: 2 })
    )
    .addBooleanOption(input => input.setName('locations')
        .setDescription('Addresses shown on map')
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

    const circles: number = interaction.options.getNumber('circles') ?? 1;
    const locations: boolean = interaction.options.getBoolean('locations') ?? false;

    try {
        const mapCenter: ImageCenter = { x: 1024, y: 540 };
        const radarCenter: ImageCenter = { x: 480, y: 503 };
        const mapCropData: number[] = [650, 720];

        const mapInfo: CropInfo = {
            ...mapCenter,
            width: mapCropData[circles - 1],
            height: mapCropData[circles - 1]
        };
        const radarInfo: CropInfo = {
            ...radarCenter,
            width: 200 + ((circles - 1) * 250),
            height: 200 + ((circles - 1) * 250)
        };

        const mapImage = await Jimp.read(join(process.cwd(), `/assets/siata/${ locations ? 'locations' : 'clean' }/mapsmoothdark${ circles }x.png`));
        const radarImage = await Jimp.read("https://siata.gov.co/kml/00_Radar/Ultimo_Barrido/AreaMetRadar_10_120_DBZH.png");
        const legend = await Jimp.read(join(process.cwd(), '/assets/siata/radarLegend.png'));

        const mapCropped = await getCroppedImage(mapImage, mapInfo);
        const radarCropped = await getCroppedImage(radarImage, radarInfo);

        const outputSize = 1080;
        mapCropped.resize({ w: outputSize, h: outputSize });
        radarCropped.resize({ w: outputSize, h: outputSize }).invert().opacity(0.5);
        legend.invert().scale(0.17).opacity(0.5);

        mapCropped.composite(radarCropped, HorizontalAlign.CENTER, VerticalAlign.MIDDLE);
        mapCropped.composite(legend, mapCropped.bitmap.width - legend.bitmap.width - 10, mapCropped.bitmap.height - legend.bitmap.height - 10);

        const imageBuffer = await mapCropped.getBuffer(JimpMime.png);
        const attachment: AttachmentBuilder = new AttachmentBuilder(imageBuffer, { name: 'siata.png' });

        return interaction.editReply({
            embeds: [Success({
                title: "SIATA",
                description: `Radar Zoom x${ circles }`,
                image: {
                    url: `attachment://siata.png`
                }
            })], files: [attachment]
        });
    } catch (error) {
        console.error('Error processing images:', error);
        return interaction.editReply({ embeds: [Error({ description: 'An error occurred while processing the images.' })] });
    }
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
