import { Message } from 'discord.js';
import { Botrucho } from '@/mongodb';

export async function execute(client: Botrucho, message: Message) {
  const { deleted_messages } = client;
  if (deleted_messages.has(message)) {
    deleted_messages.delete(message);
  }
}
