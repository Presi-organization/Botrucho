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
      const outputSize = 1080;
      const mapCropSize = [650, 720][circles - 1];
      const radarCropSize = 200 + (circles - 1) * 250;

      const mapCenter: ImageCenter = { x: 1024, y: 540 };
      const radarCenter: ImageCenter = { x: 480, y: 503 };
      const mapCrop: CropInfo = { ...mapCenter, width: mapCropSize, height: mapCropSize };
      const radarCrop: CropInfo = { ...radarCenter, width: radarCropSize, height: radarCropSize };

      const folder: 'smoothdark' | 'googlestreets' = group === 'stadia' ? 'smoothdark' : 'googlestreets';
      const mapPath = path.join(process.cwd(), `/assets/siata/${folder}/${subcommand}/map${circles}x.png`);
      const radarPath = path.join(process.cwd(), '/assets/siata/radar.png');
      const legendPath = path.join(process.cwd(), '/assets/siata/radarLegend.png');

      const [mapImg, radarImg, legendImg] = await Promise.all([
        loadImage(mapPath),
        loadImage(radarPath),
        loadImage(legendPath)
      ]);

      const canvas = createCanvas(outputSize, outputSize);
      const ctx = canvas.getContext('2d');

      // Map
      drawCroppedImage(ctx, mapImg, mapCrop, { x: 0, y: 0, width: outputSize, height: outputSize });

      // Radar
      ctx.globalAlpha = 0.5;
      const radar = group === 'stadia' ? await invertCanvasImage(radarImg) : radarImg;
      drawCroppedImage(ctx, radar, radarCrop, { x: 0, y: 0, width: outputSize, height: outputSize });
      ctx.globalAlpha = 1.0;

      // Legend
      const legendScale = 0.17;
      const legendW = legendImg.width * legendScale;
      const legendH = legendImg.height * legendScale;
      const legendX = outputSize - legendW - 10;
      const legendY = outputSize - legendH - 10;

      const legend = group === 'stadia' ? await invertCanvasImage(legendImg) : legendImg;
      ctx.drawImage(legend, legendX, legendY, legendW, legendH);

      const buffer = canvas.toBuffer('image/png');
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

      const outputSize = 1080;
      const mapCrop: CropInfo = { x: 1024, y: 540, width: 650, height: 650 };
      const radarCrop: CropInfo = { x: 480, y: 503, width: 200, height: 200 };

      const folder: 'smoothdark' | 'googlestreets' = group === 'stadia' ? 'smoothdark' : 'googlestreets';
      const mapPath = path.join(process.cwd(), `/assets/siata/${folder}/clean/map${circles}x.png`);
      const mapImg = await loadImage(mapPath);

      const canvas = createCanvas(outputSize, outputSize);
      const ctx = canvas.getContext('2d');

      const encoder = new GIFEncoder(outputSize, outputSize);
      const gifPath = path.join(process.cwd(), '/assets/siata/radar_timelapse.gif');
      encoder.createReadStream().pipe(fsCallback.createWriteStream(gifPath));

      encoder.start();
      encoder.setRepeat(0);
      encoder.setDelay(500);
      encoder.setQuality(10);

      for (let i = 0; i < radarImages.length; i++) {
        const radarRaw = await loadImage(radarImages[i]);
        const radarImg = group === 'stadia' ? await invertCanvasImage(radarRaw) : radarRaw;

        ctx.clearRect(0, 0, outputSize, outputSize);
        drawCroppedImage(ctx, mapImg, mapCrop, { x: 0, y: 0, width: outputSize, height: outputSize });

        ctx.globalAlpha = 0.5;
        drawCroppedImage(ctx, radarImg, radarCrop, { x: 0, y: 0, width: outputSize, height: outputSize });

        const progressHeight = 10;
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(
          0,
          outputSize - progressHeight,
          (outputSize * (i + 1)) / radarImages.length, // proportional width
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
