import { GuildQueue } from "discord-player";
import Botrucho from "@/mongodb/base/Botrucho";
import { PlayerMetadata } from "@/types/PlayerMetadata";

export async function execute(client: Botrucho, queue: GuildQueue<PlayerMetadata>, _oldVolume: number, newVolume: number): Promise<void> {
  const { guildData } = client;
  const guildId: string = queue.guild.id;

  await guildData.setVolume({ guildId, newVolume });
}
