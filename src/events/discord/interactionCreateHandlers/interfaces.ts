import { BaseInteraction } from 'discord.js';

export interface IIntCreateHandler {
  handle(interaction: BaseInteraction): Promise<boolean>;
}
