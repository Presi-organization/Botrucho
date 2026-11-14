import {
  SlashCommandBooleanOption,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandStringOption,
} from 'discord.js';

import { footballCompetitions } from '@/config/football-competitions';
import {
  addDays,
  bogotaDate,
  buildFootballPages,
  filterByDate,
  formatLongDate,
  getEspnMatches,
  isDateKey,
} from '@/services';
import { CommandInteractionWithClient, FootballMatch, FootballPage, ICommand } from '@/types';
import { Error, Info } from '@/utils';

const MAX_PAGES = 5;

export default class FootballCommand extends ICommand {
  name = 'football';
  description = 'Display the matches of a day.';
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('football')
    .setDescription('Display the matches of a day (default: today).')
    .addStringOption((option: SlashCommandStringOption) =>
      option
        .setName('competition')
        .setDescription('Only this competition')
        .addChoices(
          ...footballCompetitions.map((competition) => ({
            name: competition.name,
            value: competition.key,
          })),
        ),
    )
    .addStringOption((option: SlashCommandStringOption) =>
      option.setName('date').setDescription('Day to show, as YYYY-MM-DD (Bogota time)'),
    )
    .addBooleanOption((option: SlashCommandBooleanOption) =>
      option.setName('finished').setDescription('Only finished matches (default day: yesterday)'),
    );

  async execute(interaction: CommandInteractionWithClient): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    await interaction.deferReply();

    const competitionKey = interaction.options.getString('competition');
    const finished = interaction.options.getBoolean('finished') ?? false;
    const dateKey =
      interaction.options.getString('date') ?? addDays(bogotaDate(), finished ? -1 : 0);

    if (!isDateKey(dateKey)) {
      await interaction.editReply({
        embeds: [Error({ description: 'Invalid date. Use the format YYYY-MM-DD.' })],
      });
      return;
    }

    const matches: FootballMatch[] | undefined = await getEspnMatches(dateKey, addDays(dateKey, 1));
    if (!matches) {
      await interaction.editReply({
        embeds: [Error({ description: 'Could not fetch matches right now. Try again later.' })],
      });
      return;
    }

    const pages: FootballPage[] = buildFootballPages({
      title: `⚽ ${finished ? 'Resultados' : 'Partidos'} · ${formatLongDate(dateKey)}`,
      matches: filterByDate(matches, dateKey).filter(
        (match) => !finished || match.state === 'post',
      ),
      competitionKeys: competitionKey ? [competitionKey] : undefined,
      maxPages: MAX_PAGES,
      moreHint: competitionKey ? '' : 'Filtra por competición para ver el resto.',
    });

    if (!pages.length) {
      await interaction.editReply({ embeds: [Info({ description: 'No matches found.' })] });
      return;
    }

    const [first, ...rest] = pages.map((page) => Info(page));
    await interaction.editReply({ embeds: [first] });
    for (const embed of rest) await interaction.followUp({ embeds: [embed] });
  }
}
