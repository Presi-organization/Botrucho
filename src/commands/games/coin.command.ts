import { CommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import { IGuildData } from '@/mongodb';
import { CoinKeys, ICommand, TranslationElement } from '@/types';
import { Info } from '@/utils';

export default class CoinCommand extends ICommand {
  name = 'coin';
  description = 'Coin flip game';
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('coin')
    .setDescription('Coin flip game');

  async execute(interaction: CommandInteraction, guildDB: IGuildData): Promise<void> {
    const { COIN_FLIP, HEADS, TAILS }: TranslationElement<CoinKeys> = interaction.translate('COIN', guildDB.lang);
    const result: string = this._flipCoin() === 0 ? HEADS : TAILS;

    await interaction.reply({
      embeds: [Info({ description: COIN_FLIP.replace('${result}', result) })],
      withResponse: true
    });
  };

  private _flipCoin(): 0 | 1 {
    const array = new Uint8Array(1);
    crypto.getRandomValues(array);
    return array[0] % 2 as 0 | 1;
  }

}
