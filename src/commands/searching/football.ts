import {
  CommandInteraction,
  EmbedBuilder,
  SlashCommandSubcommandGroupBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { getCompetitions } from "@/services/REST/footballAPI";
import {
  competitionNames,
  Competitions,
  FootballResult,
  isMatches,
  isResults,
  Match,
  Result,
  subcommandToCompetition
} from "@/types/Football";
import { Error, Info } from "@/util/embedMessage";

const competitions = [
  { name: "champions", description: "Champions League" },
  { name: "europaleague", description: "Europa League" },
  { name: "premier", description: "Premier League" },
  { name: "laliga", description: "La Liga" },
  { name: "seriea", description: "Serie A" },
  { name: "ligue1", description: "Ligue 1" },
  { name: "bundesliga", description: "Bundesliga" },
  { name: "fpc", description: "Fútbol Profesional Colombiano" }
];

const createSubcommandGroup = (name: string, description: string): SlashCommandSubcommandGroupBuilder => {
  const group = new SlashCommandSubcommandGroupBuilder()
    .setName(name)
    .setDescription(description);

  competitions.forEach(comp => {
    group.addSubcommand(subcommand =>
      subcommand.setName(comp.name).setDescription(comp.description)
    );
  });

  return group;
};

export const name = 'football';
export const data: SlashCommandSubcommandsOnlyBuilder = new SlashCommandBuilder()
  .setName("football")
  .setDescription("Display matches.")
  .addSubcommandGroup(createSubcommandGroup("matches", "Future matches"))
  .addSubcommandGroup(createSubcommandGroup("results", "Results of matches"));

export async function execute(interaction: CommandInteraction) {
  if (!interaction.isChatInputCommand()) return;

  await interaction.deferReply();

  const group: string = interaction.options.getSubcommandGroup(true);
  const subcommand: string = interaction.options.getSubcommand();
  const competition: Competitions = subcommandToCompetition[subcommand];

  try {
    const response: FootballResult = await getCompetitions(
      competition,
      group === "matches" ? "SCHEDULED" : "FINISHED"
    );
    if (!response) return interaction.editReply({ embeds: [Error({ description: "No matches found" })] });

    const embed: EmbedBuilder = new EmbedBuilder()
      .setTitle(`⚽ ${competitionNames[competition]}`)

    if (isMatches(response)) {
      const fields = response.matches.map((match: Match) => ({
        name: `> ***${match.homeTeam}*** ᴠs ***${match.awayTeam}***`,
        value: `⤳ 🗓️ ${match.localDate}`,
        inline: false
      }));
      embed
        .setDescription(`📌 Next matches for ${response?.stage}`)
        .setFields(fields);
    } else if (isResults(response)) {
      const fields = response.results.map((result: Result) => ({
        name: `> ***${result.homeTeam}*** ᴠs ***${result.awayTeam}***`,
        value: `⤳ 🏆 ${result.homeResult} - ${result.awayResult}`,
        inline: false
      }));
      embed
        .setDescription(`📌 Last matches for ${response?.stage}`)
        .setFields(fields);
    }
    return interaction.editReply({ embeds: [Info(embed.toJSON())] });
  } catch (e) {
    return interaction.editReply({ embeds: [Error({ description: "error" })] });
  }
}
