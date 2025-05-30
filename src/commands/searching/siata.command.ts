import fs from 'fs/promises';
import path from 'path';
import {
  AttachmentBuilder,
  CommandInteraction,
  SlashCommandNumberOption,
  SlashCommandSubcommandGroupBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from '@/mongodb';
import {
  CropInfo,
  ICommand,
  ImageCenter,
  RenderParams,
  RenderParamsWithGif,
  SiataKeys,
  TranslationElement
} from '@/types';
import { Error, logger, runRenderWorker, Success } from '@/utils';

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
    const circles: number = interaction.options.getNumber('circles') ?? 1;
    const { mapCrop, radarCrop, folder } = this._getCropSettings(circles, group);

    try {
      if (subcommand === 'timelapse') await this._handleTimelapse(interaction, group, folder, mapCrop, radarCrop, circles);
      else await this._handleStaticImage(interaction, group, folder, subcommand, mapCrop, radarCrop, circles, ZOOM);
    } catch (error) {
      logger.error('Error processing images:', error);
      console.error('Error processing images:', error);
      await interaction.editReply({ embeds: [Error({ description: ERR })] });
    }
  }

  private async _handleTimelapse(interaction: CommandInteraction, group: string, folder: string, mapCrop: CropInfo, radarCrop: CropInfo, circles: number): Promise<void> {
    const radarImages = await this._getSortedRadarImages();
    if (radarImages.length < 2) {
      await interaction.editReply({ embeds: [Error({ description: 'Not enough radar images collected yet for a timelapse.' })] });
      return;
    }

    const mapPath = this._resolveAssetPath('siata', folder, 'clean', `map${circles}x.png`);
    const gifPath = this._resolveAssetPath('siata', 'radar_timelapse.gif');

    const workerParams: RenderParamsWithGif = {
      radarImages,
      mapPath,
      mapCrop,
      radarCrop,
      outputSize: OUTPUT_SIZE,
      gifPath,
      invertRadar: group === 'stadia',
      showProgress: true
    };

    await runRenderWorker(workerParams);

    const attachment = new AttachmentBuilder(gifPath, { name: 'radar_timelapse.gif' });
    await this._replyWithSuccess(
      interaction,
      'SIATA Radar Timelapse',
      `Showing ${radarImages.length} radar images`,
      attachment,
      'radar_timelapse.gif'
    );
  }

  private async _handleStaticImage(interaction: CommandInteraction, group: string, folder: string, subcommand: string, mapCrop: CropInfo, radarCrop: CropInfo, circles: number, zoomText: string) {
    const mapPath = this._resolveAssetPath('siata', folder, subcommand, `map${circles}x.png`);
    const radarPath = this._resolveAssetPath('siata', 'radar.png');
    const legendPath = this._resolveAssetPath('siata', 'radarLegend.png');

    const workerParams: RenderParams = {
      mapPath,
      radarPath,
      legendPath,
      mapCrop,
      radarCrop,
      outputSize: OUTPUT_SIZE,
      invertRadarLegend: group === 'stadia',
      legendScale: LEGEND_SCALE
    };

    const buffer = await runRenderWorker(workerParams);
    const attachment = new AttachmentBuilder(buffer, { name: 'siata.png' });
    await this._replyWithSuccess(
      interaction,
      'SIATA',
      zoomText.replace('${zoom}', circles.toString()),
      attachment,
      'siata.png'
    );
  }

  private async _getSortedRadarImages(): Promise<string[]> {
    const radarDir = this._resolveAssetPath('siata', 'radar_history');
    const files = await fs.readdir(radarDir);
    return files
      .filter(f => f.startsWith('radar_') && f.endsWith('.png'))
      .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
      .map(f => path.join(radarDir, f));
  }

  private _getCropSettings(circles: number, group: string) {
    const mapCropSize = [650, 720][circles - 1];
    const radarCropSize = 200 + (circles - 1) * 250;

    return {
      mapCrop: { ...MAP_CENTER, width: mapCropSize, height: mapCropSize },
      radarCrop: { ...RADAR_CENTER, width: radarCropSize, height: radarCropSize },
      folder: getFolder(group),
    };
  }

  private _resolveAssetPath(...segments: string[]): string {
    return path.join(process.cwd(), 'assets', ...segments);
  }

  private async _replyWithSuccess(
    interaction: CommandInteraction,
    title: string,
    description: string,
    attachment: AttachmentBuilder,
    filename: string
  ) {
    await interaction.editReply({
      embeds: [Success({ title, description, image: { url: `attachment://${filename}` } })],
      files: [attachment]
    });
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
