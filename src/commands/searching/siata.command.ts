import fs from 'fs/promises';
import fsCallback from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';
// @ts-expect-error: GIFEncoder is not a module
import GIFEncoder from 'gif-encoder-2';
import {
  AttachmentBuilder,
  CommandInteraction,
  SlashCommandNumberOption,
  SlashCommandSubcommandGroupBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from '@/mongodb';
import { CropInfo, ICommand, ImageCenter, SiataKeys, TranslationElement } from '@/types';
import { drawCroppedImage, Error, invertCanvasImage, logger, Success } from '@/utils';

const radarLayers = [
  { name: 'locations', description: 'Addresses shown on map' },
  { name: 'clean', description: 'Map without markers' },
  { name: 'timelapse', description: 'Generate a timelapse of radar images' }
];

const OUTPUT_SIZE = 1080;
const MAP_CENTER: ImageCenter = { x: 1024, y: 540 };
const RADAR_CENTER: ImageCenter = { x: 480, y: 503 };
const LEGEND_SCALE = 0.17;

function getFolder(group: string): 'smoothdark' | 'googlestreets' {
  return group === 'stadia' ? 'smoothdark' : 'googlestreets';
}

function createCanvasContext() {
  const canvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  return canvas.getContext('2d');
}

export default class SiataCommand extends ICommand {
  name = 'siata';
  description = 'Display siata image.';
  data: SlashCommandSubcommandsOnlyBuilder = new SlashCommandBuilder()
    .setName('siata')
    .setDescription('Siata\'s image.')
    .addSubcommandGroup(this._createSubcommandGroup('google', 'Google Maps Tile Layer'))
    .addSubcommandGroup(this._createSubcommandGroup('stadia', 'Stadia Maps Tile Layer'));

  async execute(interaction: CommandInteraction, guildDB: IGuildData): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const { ZOOM, ERR }: TranslationElement<SiataKeys> = interaction.translate('SIATA', guildDB.lang);
    await interaction.deferReply();

    const group = interaction.options.getSubcommandGroup(true);
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'timelapse') return this.createRadarTimelapse(interaction, guildDB, group);

    const circles: number = interaction.options.getNumber('circles') ?? 1;
    try {
      const mapCropSize = [650, 720][circles - 1];
      const radarCropSize = 200 + (circles - 1) * 250;

      const mapCrop: CropInfo = { ...MAP_CENTER, width: mapCropSize, height: mapCropSize };
      const radarCrop: CropInfo = { ...RADAR_CENTER, width: radarCropSize, height: radarCropSize };

      const folder = getFolder(group);
      const mapPath = path.join(process.cwd(), `/assets/siata/${folder}/${subcommand}/map${circles}x.png`);
      const radarPath = path.join(process.cwd(), '/assets/siata/radar.png');
      const legendPath = path.join(process.cwd(), '/assets/siata/radarLegend.png');

      const [mapImg, radarImg, legendImg] = await Promise.all([
        loadImage(mapPath),
        loadImage(radarPath),
        loadImage(legendPath)
      ]);

      const ctx = createCanvasContext();

      drawCroppedImage(ctx, mapImg, mapCrop, { x: 0, y: 0, width: OUTPUT_SIZE, height: OUTPUT_SIZE });

      ctx.globalAlpha = 0.5;
      const radar = group === 'stadia' ? await invertCanvasImage(radarImg) : radarImg;
      drawCroppedImage(ctx, radar, radarCrop, { x: 0, y: 0, width: OUTPUT_SIZE, height: OUTPUT_SIZE });
      ctx.globalAlpha = 1.0;

      const legendW = legendImg.width * LEGEND_SCALE;
      const legendH = legendImg.height * LEGEND_SCALE;
      const legendX = OUTPUT_SIZE - legendW - 10;
      const legendY = OUTPUT_SIZE - legendH - 10;

      const legend = group === 'stadia' ? await invertCanvasImage(legendImg) : legendImg;
      ctx.drawImage(legend, legendX, legendY, legendW, legendH);

      const buffer = ctx.canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: 'siata.png' });

      await interaction.editReply({
        embeds: [
          Success({
            title: 'SIATA',
            description: ZOOM.replace('${zoom}', circles.toString()),
            image: { url: 'attachment://siata.png' }
          })
        ],
        files: [attachment]
      });
    } catch (error) {
      logger.error('Error processing images:', error);
      await interaction.editReply({ embeds: [Error({ description: ERR })] });
    }
  }

  async createRadarTimelapse(interaction: CommandInteraction, guildDB: IGuildData, group: string): Promise<void> {
    if (!interaction.isChatInputCommand()) return;
    const { ERR }: TranslationElement<SiataKeys> = interaction.translate('SIATA', guildDB.lang);

    const circles: number = interaction.options.getNumber('circles') ?? 1;
    try {
      const radarDir = path.join(process.cwd(), '/assets/siata/radar_history/');
      const radarImages = (await fs.readdir(radarDir))
        .filter(f => f.startsWith('radar_') && f.endsWith('.png'))
        .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
        .map(f => path.join(radarDir, f));

      if (radarImages.length < 2) {
        await interaction.editReply({ embeds: [Error({ description: 'Not enough radar images collected yet for a timelapse.' })] });
        return;
      }

      const mapCropSize = [650, 720][circles - 1];
      const radarCropSize = 200 + (circles - 1) * 250;

      const mapCrop: CropInfo = { ...MAP_CENTER, width: mapCropSize, height: mapCropSize };
      const radarCrop: CropInfo = { ...RADAR_CENTER, width: radarCropSize, height: radarCropSize };

      const folder = getFolder(group);
      const mapPath = path.join(process.cwd(), `/assets/siata/${folder}/clean/map${circles}x.png`);
      const mapImg = await loadImage(mapPath);

      const ctx = createCanvasContext();

      const encoder = new GIFEncoder(OUTPUT_SIZE, OUTPUT_SIZE);
      const gifPath = path.join(process.cwd(), '/assets/siata/radar_timelapse.gif');
      encoder.createReadStream().pipe(fsCallback.createWriteStream(gifPath));

      encoder.start();
      encoder.setRepeat(0);
      encoder.setDelay(500);
      encoder.setQuality(10);

      for (let i = 0; i < radarImages.length; i++) {
        const radarRaw = await loadImage(radarImages[i]);
        const radarImg = group === 'stadia' ? await invertCanvasImage(radarRaw) : radarRaw;

        ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
        drawCroppedImage(ctx, mapImg, mapCrop, { x: 0, y: 0, width: OUTPUT_SIZE, height: OUTPUT_SIZE });

        ctx.globalAlpha = 0.5;
        drawCroppedImage(ctx, radarImg, radarCrop, { x: 0, y: 0, width: OUTPUT_SIZE, height: OUTPUT_SIZE });

        const progressHeight = 10;
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(
          0,
          OUTPUT_SIZE - progressHeight,
          (OUTPUT_SIZE * (i + 1)) / radarImages.length,
          progressHeight
        );
        ctx.globalAlpha = 1.0;
        encoder.addFrame(ctx);
      }

      encoder.finish();

      await new Promise<void>(res => setTimeout(res, 500));

      const attachment = new AttachmentBuilder(gifPath, { name: 'radar_timelapse.gif' });
      await interaction.editReply({
        embeds: [Success({
          title: 'SIATA Radar Timelapse',
          description: `Showing ${radarImages.length} radar images`,
          image: { url: 'attachment://radar_timelapse.gif' }
        })],
        files: [attachment]
      });
    } catch (error) {
      logger.error('Error creating radar timelapse:', error);
      await interaction.editReply({ embeds: [Error({ description: ERR })] });
    }
  }

  private _createSubcommandGroup(name: string, description: string): SlashCommandSubcommandGroupBuilder {
    const group = new SlashCommandSubcommandGroupBuilder()
      .setName(name)
      .setDescription(description);

    radarLayers.forEach(radarLayer => {
      group.addSubcommand(subcommand =>
        subcommand.setName(radarLayer.name).setDescription(radarLayer.description)
          .addNumberOption((input: SlashCommandNumberOption) => input
            .setName('circles')
            .setDescription('Number of circles (zoom) to display')
            .addChoices({ name: '1', value: 1 }, { name: '2', value: 2 })
          )
      );
    });

    return group;
  }
}
