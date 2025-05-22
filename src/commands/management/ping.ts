import {
  CommandInteraction,
  EmbedBuilder,
  InteractionCallbackResponse,
  SlashCommandOptionsOnlyBuilder
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Botrucho, IGuildData } from '@/mongodb';
import { PingKeys, TranslationElement } from '@/types';
import { Info, logger } from '@/utils';

export const name = 'ping';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong!')

export async function execute(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData) {
  const { PINGING, PONG }: TranslationElement<PingKeys> = interaction.translate('PING', guildDB.lang);

  interaction.reply({ embeds: [Info({ description: PINGING })], withResponse: true })
    .then((sent: InteractionCallbackResponse) => {
      const content: EmbedBuilder = Info({
        description: PONG
          .replace(
            '${latency}',
            (
              sent.resource?.message?.createdTimestamp != null
                ? sent.resource.message.createdTimestamp - interaction.createdTimestamp
                : 0
            ).toString()
          )
          .replace('${heartbeat}', (interaction.client.ws.ping).toString())
      });
      interaction.editReply({ embeds: [content] });
    })
    .catch(logger.error);
}
