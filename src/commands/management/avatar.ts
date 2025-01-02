import { CommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from "@mongodb/models/GuildData";

export const name = 'avatar';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Get the avatar URL of the selected user, or your own avatar.')
    .addUserOption(option => option.setName('user-tag').setDescription('The user\'s avatar to show'));

export async function execute(interaction: CommandInteraction, guildDB: IGuildData) {
    if (!interaction.isChatInputCommand()) return;

    const user = interaction.options.getUser('user-tag');
    const avatarTranslate = (interaction.translate("AVATAR_USER", guildDB.lang) as { [p: string]: string })

    if (user) return interaction.reply(avatarTranslate['user'].replace("${username}", user.username).replace("${image}", user.displayAvatarURL()));
    return interaction.reply(avatarTranslate["self"].replace("${image}", interaction.user.displayAvatarURL()));
}
