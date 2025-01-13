import { CommandInteraction, SlashCommandOptionsOnlyBuilder, SlashCommandUserOption } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from "@mongodb/models/GuildData";
import { Info } from "@util/embedMessage";
import { AvatarKeys, TranslationElement } from "@customTypes/Translations";

export const name = 'avatar';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Get the avatar URL of the selected user, or your own avatar.')
    .addUserOption((option: SlashCommandUserOption) => option.setName('user-tag').setDescription('The user\'s avatar to show'));

export async function execute(interaction: CommandInteraction, guildDB: IGuildData) {
    if (!interaction.isChatInputCommand()) return;

    const { USER, SELF }: TranslationElement<AvatarKeys> = interaction.translate("AVATAR", guildDB.lang);

    const user = interaction.options.getUser('user-tag');
    if (user) {
        return interaction.reply({ embeds: [Info({ description: USER.replace("${username}", user.username).replace("${image}", user.displayAvatarURL()) })] });
    }
    return interaction.reply({ embeds: [Info({ description: SELF.replace("${image}", interaction.user.displayAvatarURL()) })] });
}
