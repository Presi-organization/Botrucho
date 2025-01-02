import { CommandInteraction, MessageFlags, VoiceBasedChannel } from "discord.js";
import { Player, QueueRepeatMode, SearchResult, useMainPlayer } from "discord-player";
import { SlashCommandBuilder } from "@discordjs/builders";
import { createReplyOptions, Error, Warning } from "@util/embedMessage";
import { IGuildData } from "@mongodb/models/GuildData";

export const name = 'play';
export const description = 'Plays a music in your voice channel.';
export const cat = 'music';
export const botpermissions = ['CONNECT', 'SPEAK'];
export const data = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Plays a music in your voice channel.')
    .addStringOption(option => option.setName('song').setDescription('The name of the song.').setRequired(true));

export async function execute(interaction: CommandInteraction, guildDB: IGuildData) {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const player: Player = useMainPlayer();
    const channel: VoiceBasedChannel = interaction.member.voice.channel!;
    const name: string = interaction.options.getString('song', true);

    if (!interaction.member.voice?.channel) return interaction.reply(createReplyOptions(Error({ description: 'Connect to a Voice Channel' })));

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const searchResult: SearchResult = await player.search(name, { requestedBy: interaction.user });

    if (!searchResult.hasTracks()) {
        const embed = {
            title: 'No results found',
            description: `No results found for \`${ name }\``,
            author: {
                name: interaction.guild.name,
                icon_url: interaction.guild.iconURL() ?? undefined
            }
        };

        return interaction.editReply(createReplyOptions(Error(embed)));
    }

    console.log(searchResult.hasPlaylist() ? searchResult?.playlist : "SINGLE SONG");

    const embed = {
        title: 'Song added to Queue',
        description: `[${ searchResult.tracks[0].title } - ${ searchResult.tracks[0].author }](${ searchResult.tracks[0].url }) has been added to Queue`
    };

    await interaction.editReply(createReplyOptions(Warning(embed), { flags: MessageFlags.Ephemeral }));
    setTimeout(() => {
        interaction.deleteReply();
    }, 5000);

    try {
        await player.play(channel, searchResult, {
            nodeOptions: {
                metadata: {
                    channel: interaction.channel,
                    queueMessage: null,
                    currentTrack: undefined,
                    queueTitles: [],
                    message: interaction,
                },
                volume: guildDB.defaultVolume,
                repeatMode: QueueRepeatMode[guildDB.loopMode as keyof typeof QueueRepeatMode],
                noEmitInsert: true,
                leaveOnStop: false,
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 30000,
                leaveOnEnd: true,
                leaveOnEndCooldown: 30000,
                pauseOnEmpty: true,
                preferBridgedMetadata: true,
                disableBiquad: true
            },
            requestedBy: interaction.user,
            connectionOptions: {
                deaf: true,
            }
        });
    } catch (e) {
        console.log(`Something went wrong: ${ e }`);
    }
}
