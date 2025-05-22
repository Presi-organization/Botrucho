import { GuildQueue } from 'discord-player';
import { Botrucho } from '@/mongodb';
import { PlayerType } from '@/types';

export async function execute(client: Botrucho, queue: GuildQueue<PlayerType>, _oldVolume: number, newVolume: number): Promise<void> {
  const { guildData } = client;
  const guildId: string = queue.guild.id;

  await guildData.setVolume({ guildId, newVolume });
}
