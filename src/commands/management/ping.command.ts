import { EmbedBuilder, InteractionCallbackResponse, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from '@/mongodb';
import { ICommand, CommandInteractionWithClient, PingKeys, TranslationElement } from '@/types';
import { Info, logger } from '@/utils';

export default class PingCommand extends ICommand {
  name = 'ping';
  description = 'Ping the bot to check if it is online';
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping the bot to check if it is online');

  async execute(interaction: CommandInteractionWithClient, guildDB: IGuildData): Promise<void> {
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
}
