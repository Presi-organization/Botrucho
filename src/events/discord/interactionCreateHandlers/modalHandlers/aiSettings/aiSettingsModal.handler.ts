import { BaseInteraction, MessageFlags, ModalSubmitInteraction } from 'discord.js';

import { IIntCreateHandler } from '@/events/discord/interactionCreateHandlers';
import { Botrucho } from '@/mongodb';
import {
  FormResult,
  parseInstructionForm,
  parseLimitsForm,
  parseModelForm,
} from '@/runtime/ai-settings';
import {
  AI_INSTRUCTION_FIELD,
  AI_SETTINGS_MODAL,
  buildAiSettingsPanel,
  Error,
  isAiOwner,
  logger,
} from '@/utils';

type SettingsPatch = Parameters<Botrucho['aiSettings']['update']>[0];

const read = <K extends string>(interaction: ModalSubmitInteraction, keys: K[]) =>
  Object.fromEntries(keys.map((key) => [key, interaction.fields.getTextInputValue(key)])) as Record<
    K,
    string
  >;

const PARSERS: Record<string, (interaction: ModalSubmitInteraction) => FormResult<SettingsPatch>> =
  {
    limits: (interaction) => {
      const result = parseLimitsForm(
        read(interaction, [
          'userCooldownSec',
          'userDaily',
          'guildDaily',
          'globalDaily',
          'globalDailyTokens',
        ]),
      );
      return result.ok ? { ok: true, value: { limits: result.value } } : result;
    },
    model: (interaction) =>
      parseModelForm(
        read(interaction, [
          'model',
          'thinkingLevel',
          'googleSearch',
          'maxInputChars',
          'maxOutputTokens',
        ]),
      ),
    instructions: (interaction) => {
      const result = parseInstructionForm(
        interaction.fields.getTextInputValue(AI_INSTRUCTION_FIELD),
      );
      return result.ok ? { ok: true, value: { systemInstruction: result.value } } : result;
    },
  };

export class AiSettingsModalHandler implements IIntCreateHandler {
  private client: Botrucho;

  constructor(client: Botrucho) {
    this.client = client;
  }

  handle = async (interaction: BaseInteraction): Promise<boolean> => {
    if (!interaction.isModalSubmit() || !interaction.inCachedGuild()) return false;
    const [prefix, section] = interaction.customId.split(':');
    if (prefix !== AI_SETTINGS_MODAL || !PARSERS[section]) return false;

    if (!isAiOwner(interaction)) {
      await interaction.reply({
        embeds: [Error({ description: 'Only bot owners can manage the AI.' })],
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    const result = PARSERS[section](interaction);
    if (!result.ok) {
      await interaction.reply({
        embeds: [Error({ title: 'Not saved', description: result.error })],
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    await this.client.aiSettings.update(result.value);
    logger.log(`[AI] ${interaction.user.tag} updated AI ${section} settings`);
    const panel = await buildAiSettingsPanel(this.client, interaction.guildId);
    if (interaction.isFromMessage()) await interaction.update(panel);
    else await interaction.reply({ ...panel, flags: MessageFlags.Ephemeral });
    return true;
  };
}
