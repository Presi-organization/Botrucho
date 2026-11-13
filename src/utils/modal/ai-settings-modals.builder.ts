import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

import { MAX_INSTRUCTION_CHARS, THINKING_LEVELS } from '@/runtime/ai-settings';
import { AiSettings } from '@/types';

export const AI_SETTINGS_MODAL = 'ai-settings-modal';
export const AI_INSTRUCTION_FIELD = 'systemInstruction';

const input = (id: string, label: string, value: string, placeholder?: string) =>
  new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder()
      .setCustomId(id)
      .setLabel(label)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(value)
      .setPlaceholder(placeholder ?? value),
  );

export const showAiLimitsModal = (interaction: ButtonInteraction, settings: AiSettings) => {
  const { limits } = settings;
  return interaction.showModal(
    new ModalBuilder()
      .setCustomId(`${AI_SETTINGS_MODAL}:limits`)
      .setTitle('AI limits (0 disables a scope)')
      .addComponents(
        input('userCooldownSec', 'Cooldown per user (seconds)', `${limits.userCooldownSec}`),
        input('userDaily', 'Requests per user per day', `${limits.userDaily}`),
        input('guildDaily', 'Requests per server per day', `${limits.guildDaily}`),
        input('globalDaily', 'Requests per day (all servers)', `${limits.globalDaily}`),
        input('globalDailyTokens', 'Tokens per day (all servers)', `${limits.globalDailyTokens}`),
      ),
  );
};

export const showAiModelModal = (interaction: ButtonInteraction, settings: AiSettings) =>
  interaction.showModal(
    new ModalBuilder()
      .setCustomId(`${AI_SETTINGS_MODAL}:model`)
      .setTitle('AI model')
      .addComponents(
        input('model', 'Gemini model ID', settings.model, 'gemini-3.1-flash-lite'),
        input(
          'thinkingLevel',
          `Thinking level (${THINKING_LEVELS.join('/')})`,
          settings.thinkingLevel,
          'low',
        ),
        input(
          'googleSearch',
          'Google Search (on/off, billed per search)',
          settings.googleSearch ? 'on' : 'off',
          'off',
        ),
        input('maxInputChars', 'Max question length (characters)', `${settings.maxInputChars}`),
        input(
          'maxOutputTokens',
          'Max answer tokens (includes thinking)',
          `${settings.maxOutputTokens}`,
        ),
      ),
  );

export const showAiInstructionsModal = (interaction: ButtonInteraction, settings: AiSettings) =>
  interaction.showModal(
    new ModalBuilder()
      .setCustomId(`${AI_SETTINGS_MODAL}:instructions`)
      .setTitle('AI instructions')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(AI_INSTRUCTION_FIELD)
            .setLabel('System instruction')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(MAX_INSTRUCTION_CHARS)
            .setValue(settings.systemInstruction.slice(0, MAX_INSTRUCTION_CHARS)),
        ),
      ),
  );
