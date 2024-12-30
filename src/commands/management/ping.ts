import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Message } from "discord.js";
import Botrucho from "@mongodb/base/Botrucho";

module.exports = {
    name: 'ping',
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction: CommandInteraction & { client: Botrucho }): Promise<void> {
        const sent: Message = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        await interaction.editReply(`:ping_pong: Roundtrip latency: ${ sent.createdTimestamp - interaction.createdTimestamp }ms\n:ping_pong: Websocket heartbeat: ${ interaction.client.ws.ping }ms.`);
        interaction.client.deleted_messages.add(interaction);
    },
};
