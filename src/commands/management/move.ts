import {
    ChannelType,
    CommandInteraction,
    GuildMember,
    MessageFlags,
    SlashCommandChannelOption,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandUserOption,
    VoiceChannel
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from "@mongodb/models/GuildData";
import { MoveKeys, TranslationElement, VCKeys } from "@customTypes/Translations";

export const name = 'move';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('move')
    .setDescription('Select a member and move them to another channel.')
    .addUserOption((option: SlashCommandUserOption) => option.setName('user').setDescription('The member to move').setRequired(true))
    .addChannelOption((option: SlashCommandChannelOption) => option.setName('channel').setDescription('The channel to move').addChannelTypes(ChannelType.GuildVoice).setRequired(true));

export async function execute(interaction: CommandInteraction, guildDB: IGuildData) {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const { USER_MOVED }: TranslationElement<MoveKeys> = interaction.translate("MOVE", guildDB.lang);
    const { CONNECT_VC, USER_NOT_IN }: TranslationElement<VCKeys> = interaction.translate("VC", guildDB.lang);

    const user: GuildMember = interaction.options.getMember('user')!;
    const channel: VoiceChannel = interaction.options.getChannel('channel', true, [ChannelType.GuildVoice]);

    if (!(interaction.member.voice.channel)) {
        return await interaction.reply({
            content: CONNECT_VC,
            flags: MessageFlags.Ephemeral
        });
    }
    if (!(user.voice.channelId)) {
        return await interaction.reply({
            content: USER_NOT_IN,
            flags: MessageFlags.Ephemeral
        });
    }

    await user.voice.setChannel(channel);
    const user_moved = USER_MOVED
        .replace("${username}", user.user.displayName)
        .replace("${channel}", channel.name);
    return interaction.reply({ content: user_moved, flags: MessageFlags.Ephemeral });
}
