import { CommandInteraction, InteractionCallbackResponse, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';
import Botrucho from "@mongodb/base/Botrucho";
import { IGuildData } from "@mongodb/models/GuildData";
import { PingKeys, TranslationElement } from "@customTypes/Translations";

export const name = 'ping';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!')

export async function execute(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData) {
    const { PINGING, PONG }: TranslationElement<PingKeys> = interaction.translate("PING", guildDB.lang);

    interaction.reply({ content: PINGING, withResponse: true })
        .then((sent: InteractionCallbackResponse) => {
            const content: string = PONG
                .replace("${latency}", (sent.resource!.message!.createdTimestamp - interaction.createdTimestamp).toString())
                .replace("${heartbeat}", (interaction.client.ws.ping).toString());
            interaction.editReply(content);
        })
        .catch(console.error);
}
