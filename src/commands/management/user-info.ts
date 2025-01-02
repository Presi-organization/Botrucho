import { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';

export const name = 'user-info';
export const data = new SlashCommandBuilder()
    .setName('user-info')
    .setDescription('Display info about yourself.');

export async function execute(interaction: CommandInteraction) {
    return interaction.reply(`Username: ${ interaction.user.username }\nID: ${ interaction.user.id }`);
}
