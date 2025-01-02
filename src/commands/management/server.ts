import { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from "@mongodb/models/GuildData";

interface Translation {
    a: string;
    b: string;
    d: string;
    e: string;
    f: string;
}

module.exports = {
    name: 'server',
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Display info about this server.'),
    async execute(interaction: CommandInteraction, guildDB: IGuildData) {
        const translation = interaction.translate("SERVER_INFO", guildDB.lang) as unknown as Translation;

        const members = translation.a;
        const account = translation.b;
        const channels = translation.d;
        const banner = translation.e;
        const others = translation.f;

        if (!interaction.guild) {
            return interaction.reply('This command can only be used in a server.');
        }
        return interaction.reply(`Server: ${ interaction.guild.name }\n\n${ members }: ${ interaction.guild.memberCount }\n${ account }: ${ interaction.guild.ownerId }\n${ channels }: ${ interaction.guild.channels.cache.size }\n${ banner }: ${ interaction.guild.bannerURL() }\n${ others }: ${ interaction.guild.features.join(', ') }`);
    },
};
