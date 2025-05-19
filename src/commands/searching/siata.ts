import { join } from "path";
import { HorizontalAlign, Jimp, JimpMime, VerticalAlign } from 'jimp';
import {
  AttachmentBuilder,
  CommandInteraction,
  SlashCommandNumberOption,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from "@mongodb/models/GuildData";
import { Error, Success } from "@util/embedMessage";
import { logger } from "@util/Logger";
import { CropInfo, ImageCenter } from "@customTypes/ImageData";
import { SiataKeys, TranslationElement } from "@customTypes/Translations";

export const name = 'siata';
export const data: SlashCommandSubcommandsOnlyBuilder = new SlashCommandBuilder()
  .setName('siata')
  .setDescription('Siata\'s image')
  .addSubcommandGroup((group: SlashCommandSubcommandGroupBuilder) => group
    .setName('google')
    .setDescription('Google Maps Tile Layer')
    .addSubcommand((subcommand: SlashCommandSubcommandBuilder) => subcommand
      .setName('locations')
      .setDescription('Addresses shown on map')
      .addNumberOption((input: SlashCommandNumberOption) => input
        .setName('circles')
        .setDescription('Number of circles (zoom) to display')
        .addChoices({ name: '1', value: 1 }, { name: '2', value: 2 })
      )
    )
    .addSubcommand((subcommand: SlashCommandSubcommandBuilder) => subcommand
      .setName('clean')
      .setDescription('Map without markers')
      .addNumberOption((input: SlashCommandNumberOption) => input
        .setName('circles')
        .setDescription('Number of circles (zoom) to display')
        .addChoices({ name: '1', value: 1 }, { name: '2', value: 2 })
      )
    )
  )
  .addSubcommandGroup((group: SlashCommandSubcommandGroupBuilder) => group
    .setName('stadia')
    .setDescription('Stadia Maps Tile Layer')
    .addSubcommand((subcommand: SlashCommandSubcommandBuilder) => subcommand
      .setName('locations')
      .setDescription('Addresses shown on map')
      .addNumberOption((input: SlashCommandNumberOption) => input
        .setName('circles')
        .setDescription('Number of circles (zoom) to display')
        .addChoices({ name: '1', value: 1 }, { name: '2', value: 2 })
      )
    )
    .addSubcommand((subcommand: SlashCommandSubcommandBuilder) => subcommand
      .setName('clean')
      .setDescription('Map without markers')
      .addNumberOption((input: SlashCommandNumberOption) => input
        .setName('circles')
        .setDescription('Number of circles (zoom) to display')
        .addChoices({ name: '1', value: 1 }, { name: '2', value: 2 })
      )
    )
  );

export async function execute(interaction: CommandInteraction, guildDB: IGuildData) {
  if (!interaction.isChatInputCommand()) return;

  const { ZOOM, ERR }: TranslationElement<SiataKeys> = interaction.translate("SIATA", guildDB.lang);

  await interaction.deferReply();

  const group: string = interaction.options.getSubcommandGroup(true);
  const subcommand: string = interaction.options.getSubcommand();
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

    const folder: "smoothdark" | "googlestreets" = group === 'stadia' ? 'smoothdark' : 'googlestreets';
    const mapUri: string = join(process.cwd(), `/assets/siata/${folder}/${subcommand}/map${circles}x.png`);

    const [mapImage, radarImage, legend] = await Promise.all([
      Jimp.read(mapUri),
      Jimp.read("https://siata.gov.co/kml/00_Radar/Ultimo_Barrido/AreaMetRadar_10_120_DBZH.png"),
      Jimp.read(join(process.cwd(), '/assets/siata/radarLegend.png'))
    ]);

    const mapCropped = await getCroppedImage(mapImage, mapInfo);
    const radarCropped = await getCroppedImage(radarImage, radarInfo);

    const outputSize = 1080;
    mapCropped.resize({ w: outputSize, h: outputSize });
    radarCropped.resize({ w: outputSize, h: outputSize }).opacity(0.5);
    legend.scale(0.17).opacity(0.5);

    if (group === 'stadia') {
      radarCropped.invert();
      legend.invert();
    }

    mapCropped.composite(radarCropped, HorizontalAlign.CENTER, VerticalAlign.MIDDLE);
    mapCropped.composite(legend, mapCropped.bitmap.width - legend.bitmap.width - 10, mapCropped.bitmap.height - legend.bitmap.height - 10);

    const imageBuffer = await mapCropped.getBuffer(JimpMime.png);
    const attachment: AttachmentBuilder = new AttachmentBuilder(imageBuffer, { name: 'siata.png' });

    return interaction.editReply({
      embeds: [Success({
        title: "SIATA",
        description: ZOOM.replace("${zoom}", circles.toString()),
        image: {
          url: `attachment://siata.png`
        }
      })], files: [attachment]
    });
  } catch (error) {
    logger.error('Error processing images:', error);
    return interaction.editReply({ embeds: [Error({ description: ERR })] });
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
