import { ChannelType, CommandInteraction, GuildMember, MessageFlags, VoiceChannel } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from "@mongodb/models/GuildData";

export const name = 'move';
export const data = new SlashCommandBuilder()
    .setName('move')
    .setDescription('Select a member and move them to another channel.')
    .addUserOption(option => option.setName('user').setDescription('The member to move').setRequired(true))
    .addChannelOption(option => option.setName('channel').setDescription('The channel to move').addChannelTypes(ChannelType.GuildVoice).setRequired(true));

export async function execute(interaction: CommandInteraction, guildDB: IGuildData) {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const user: GuildMember = interaction.options.getMember('user')!;
    const channel: VoiceChannel = interaction.options.getChannel('channel', true, [ChannelType.GuildVoice]);

    if (!(interaction.member.voice.channel)) {
        return await interaction.reply({
            content: (interaction.translate("NOT_VOC", guildDB.lang) as string),
            flags: MessageFlags.Ephemeral
        });
    }
    if (!(user.voice.channelId)) {
        return await interaction.reply({
            content: (interaction.translate("USER_NOT_VOC", guildDB.lang) as string),
            flags: MessageFlags.Ephemeral
        });
    }

    await user.voice.setChannel(channel);
    const user_moved = (interaction.translate("USER_MOVED", guildDB.lang) as string)
        .replace("${username}", user.user.displayName)
        .replace("${channel}", channel.name);
    return interaction.reply({ content: user_moved, flags: MessageFlags.Ephemeral });
}
