import { BaseInteraction, MessageFlags } from 'discord.js';

import { IIntCreateHandler } from '@/events/discord/interactionCreateHandlers';
import { Botrucho } from '@/mongodb';
import {
  AI_SETTINGS_BUTTON,
  AiSettingsAction,
  buildAiSettingsPanel,
  Error,
  isAiOwner,
  logger,
  showAiInstructionsModal,
  showAiLimitsModal,
  showAiModelModal,
} from '@/utils';

const MODALS = {
  limits: showAiLimitsModal,
  model: showAiModelModal,
  instructions: showAiInstructionsModal,
};

export class AiSettingsButtonHandler implements IIntCreateHandler {
  private client: Botrucho;

  constructor(client: Botrucho) {
    this.client = client;
  }

  handle = async (interaction: BaseInteraction): Promise<boolean> => {
    if (!interaction.isButton() || !interaction.inCachedGuild()) return false;
    const [prefix, action] = interaction.customId.split(':') as [string, AiSettingsAction];
    if (prefix !== AI_SETTINGS_BUTTON) return false;

    if (!isAiOwner(interaction)) {
      await interaction.reply({
        embeds: [Error({ description: 'Only bot owners can manage the AI.' })],
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    if (action === 'toggle') {
      const guildDB = await this.client.guildData.showGuild(interaction.guildId);
      const aiEnabled = !guildDB?.aiEnabled;
      await this.client.guildData.setAiEnabled(interaction.guildId, aiEnabled);
      logger.log(
        `[AI] ${interaction.user.tag} ${aiEnabled ? 'enabled' : 'disabled'} AI in ${interaction.guild.name}`,
      );
      await interaction.update(await buildAiSettingsPanel(this.client, interaction.guildId));
      return true;
    }

    await MODALS[action]?.(interaction, await this.client.aiSettings.get());
    return true;
  };
}
