import path from 'path';

import { SlashCommandBuilder } from '@discordjs/builders';
import {
  AttachmentBuilder,
  CommandInteraction,
  SlashCommandBooleanOption,
  SlashCommandNumberOption,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

import { DEFAULT_RADAR_PROVIDER } from '@/config/radar';
import { IGuildData } from '@/mongodb';
import { getRadarProvider, RADAR_PROVIDER_IDS } from '@/services/radar';
import {
  ICommand,
  RadarKeys,
  RadarProvider,
  RadarProviderId,
  RenderParams,
  RenderParamsWithGif,
  TranslationElement,
} from '@/types';
import { Error, logger, runRenderWorker, Success } from '@/utils';

const OUTPUT_SIZE = 1080;

interface RadarOptions {
  provider: RadarProvider;
  map: string;
  locations: boolean;
  circles: number;
}

export default class RadarCommand extends ICommand {
  name = 'radar';
  description = 'Display the latest radar image.';
  data: SlashCommandSubcommandsOnlyBuilder = this._buildData();

  async execute(interaction: CommandInteraction, guildDB: IGuildData): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const texts: TranslationElement<RadarKeys> = interaction.translate('RADAR', guildDB.lang);
    await interaction.deferReply();

    const provider = getRadarProvider(
      (interaction.options.getString('provider') as RadarProviderId | null) ??
        DEFAULT_RADAR_PROVIDER,
    );
    const map = interaction.options.getString('map') ?? provider.maps[0].name;

    if (!provider.maps.some((available) => available.name === map)) {
      const description = texts.UNSUPPORTED_MAP.replace('${provider}', provider.title)
        .replace('${map}', map)
        .replace('${maps}', provider.maps.map((available) => available.name).join(', '));
      await interaction.editReply({ embeds: [Error({ description })] });
      return;
    }

    const options: RadarOptions = {
      provider,
      map,
      locations: interaction.options.getBoolean('locations') ?? false,
      circles: interaction.options.getNumber('circles') ?? 1,
    };

    try {
      if (interaction.options.getSubcommand() === 'timelapse')
        await this._timelapse(interaction, options, texts);
      else await this._still(interaction, options, texts);
    } catch (error) {
      logger.error('Error processing images:', error);
      await interaction.editReply({ embeds: [Error({ description: texts.ERR })] });
    }
  }

  private async _timelapse(
    interaction: CommandInteraction,
    { provider, ...request }: RadarOptions,
    texts: TranslationElement<RadarKeys>,
  ): Promise<void> {
    const scene = await provider.prepareTimelapse(request);
    if (!scene) {
      await interaction.editReply({ embeds: [Error({ description: texts.NOT_ENOUGH_FRAMES })] });
      return;
    }

    const gifPath = path.join(process.cwd(), 'assets', 'radar_timelapse.gif');
    const params: RenderParamsWithGif = {
      ...scene,
      outputSize: OUTPUT_SIZE,
      gifPath,
      showProgress: true,
    };
    await runRenderWorker(params);

    await this._reply(
      interaction,
      provider,
      texts.TIMELAPSE.replace('${title}', provider.title),
      texts.FRAMES.replace('${count}', scene.radarImages.length.toString()),
      new AttachmentBuilder(gifPath, { name: 'radar_timelapse.gif' }),
      'radar_timelapse.gif',
      texts,
    );
  }

  private async _still(
    interaction: CommandInteraction,
    { provider, ...request }: RadarOptions,
    texts: TranslationElement<RadarKeys>,
  ): Promise<void> {
    const scene = await provider.prepareStill(request);
    const params: RenderParams = { ...scene, outputSize: OUTPUT_SIZE };
    const buffer = await runRenderWorker(params);

    await this._reply(
      interaction,
      provider,
      provider.title,
      texts.ZOOM.replace('${zoom}', request.circles.toString()),
      new AttachmentBuilder(buffer, { name: 'radar.png' }),
      'radar.png',
      texts,
    );
  }

  private async _reply(
    interaction: CommandInteraction,
    provider: RadarProvider,
    title: string,
    description: string,
    attachment: AttachmentBuilder,
    filename: string,
    texts: TranslationElement<RadarKeys>,
  ): Promise<void> {
    const note = provider.kind === 'satellite' ? `\n${texts.SATELLITE_NOTE}` : '';
    await interaction.editReply({
      embeds: [
        Success({
          title,
          description: `${description}${note}`,
          image: { url: `attachment://${filename}` },
          footer: { text: provider.attribution },
        }),
      ],
      files: [attachment],
    });
  }

  private _buildData(): SlashCommandSubcommandsOnlyBuilder {
    const providers = RADAR_PROVIDER_IDS.map((id) => getRadarProvider(id));
    const maps = new Map(providers.flatMap((p) => p.maps).map((map) => [map.name, map]));

    const providerOption = (input: SlashCommandStringOption) =>
      input
        .setName('provider')
        .setDescription(`Data source (default: ${getRadarProvider().title})`)
        .addChoices(...providers.map((p) => ({ name: p.title, value: p.id })));

    const mapOption = (input: SlashCommandStringOption) =>
      input
        .setName('map')
        .setDescription('Base map (default: the first one the provider offers)')
        .addChoices(...[...maps.values()].map((m) => ({ name: m.description, value: m.name })));

    const circlesOption = (input: SlashCommandNumberOption) =>
      input
        .setName('circles')
        .setDescription('Number of circles (zoom) to display')
        .addChoices({ name: '1', value: 1 }, { name: '2', value: 2 });

    return new SlashCommandBuilder()
      .setName('radar')
      .setDescription('Radar image.')
      .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
        sub
          .setName('still')
          .setDescription('Latest radar image')
          .addStringOption(providerOption)
          .addStringOption(mapOption)
          .addBooleanOption((input: SlashCommandBooleanOption) =>
            input.setName('locations').setDescription('Show the location markers on the map'),
          )
          .addNumberOption(circlesOption),
      )
      .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
        sub
          .setName('timelapse')
          .setDescription('Generate a timelapse of radar images')
          .addStringOption(providerOption)
          .addStringOption(mapOption)
          .addNumberOption(circlesOption),
      );
  }
}
