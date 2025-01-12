import { CommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from "@mongodb/models/GuildData";
import { TranslationElement, UserInfoKeys } from "@customTypes/Translations";

export const name = 'user-info';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('user-info')
    .setDescription('Display info about yourself.');

export async function execute(interaction: CommandInteraction, guildDB: IGuildData) {
    const { USERNAME, ID }: TranslationElement<UserInfoKeys> = interaction.translate("USER_INFO", guildDB.lang);

    return interaction.reply(`${ USERNAME.replace("${name}", interaction.user.username) }\n${ ID.replace("${id}", interaction.user.id) }`);
}
