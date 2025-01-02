import { CommandInteraction, MessageFlags } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from "@mongodb/models/GuildData";
import Botrucho from "@mongodb/base/Botrucho";

export const name = 'prune';
export const data = new SlashCommandBuilder()
    .setName('prune')
    .setDescription('Prune up to 99 messages.')
    .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to prune').setRequired(true));

export async function execute(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData) {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;
    const amount = interaction.options.getInteger('amount', true);

    if (amount < 1 || amount > 100) {
        return interaction.reply({
            content: interaction.translate("PRUNE_AMOUNT_ERR", guildDB.lang) as string,
            flags: MessageFlags.Ephemeral
        });
    }

    await interaction.channel!.bulkDelete(amount, true).catch(error => {
        console.error(error);
        interaction.reply({
            content: interaction.translate("PRUNE_ERR", guildDB.lang) as string,
            flags: MessageFlags.Ephemeral
        });
    });

    await interaction.reply({
        content: (interaction.translate("PRUNE_SUCC", guildDB.lang) as string).replace("${amount}", amount.toString()),
        flags: MessageFlags.Ephemeral
    });
    interaction.client.deleted_messages.add(interaction);
}
