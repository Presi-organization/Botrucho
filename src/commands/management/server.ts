import { CommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from "@mongodb/models/GuildData";
import { ServerInfoKeys, TranslationElement } from "@customTypes/Translations";

export const name = 'server';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('server')
    .setDescription('Display info about this server.')

export async function execute(interaction: CommandInteraction, guildDB: IGuildData) {
    if (!interaction.inCachedGuild()) return;

    const serverTranslation: TranslationElement<ServerInfoKeys> = interaction.translate("SERVER_INFO", guildDB.lang);

    const server: string = serverTranslation.TITLE.replace("${name}", interaction.guild.name);
    const members: string = serverTranslation.a.replace("${count}", (interaction.guild.memberCount).toString());
    const account: string = serverTranslation.b.replace("${count}", interaction.guild.ownerId);
    const channels: string = serverTranslation.d.replace("${count}", (interaction.guild.channels.cache.size).toString());
    const banner: string = serverTranslation.e.replace("${count}", <string>interaction.guild.bannerURL());
    const others: string = serverTranslation.f.replace("${count}", interaction.guild.features.join(', '));

    if (!interaction.guild) {
        return interaction.reply(serverTranslation.ONLY_SERVER);
    }
    return interaction.reply(`${ server }\n\n${ members }\n${ account }\n${ channels }\n${ banner }\n${ others }`);
}
