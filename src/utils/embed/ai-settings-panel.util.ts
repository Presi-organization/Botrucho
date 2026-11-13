import {
  ActionRowBuilder,
  BaseInteraction,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  inlineCode,
} from 'discord.js';

import config from '@/config';
import type { Botrucho } from '@/mongodb';

import { Info } from './message-builder.util';

export const AI_SETTINGS_BUTTON = 'ai-settings';
export type AiSettingsAction = 'limits' | 'model' | 'instructions' | 'toggle';

/** AI settings, including enabling it per server, are reserved to bot owners (cost control). */
export const isAiOwner = (interaction: BaseInteraction): boolean =>
  config.owners.includes(interaction.user.id);

const number = (value: number): string => value.toLocaleString('en-US');

export const buildAiSettingsPanel = async (
  client: Botrucho,
  guildId: string,
): Promise<{ embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] }> => {
  const [settings, usage, guildDB] = await Promise.all([
    client.aiSettings.get(),
    client.aiLimiter.usage(guildId),
    client.guildData.showGuild(guildId),
  ]);
  const enabled = !!guildDB?.aiEnabled;
  const { limits } = settings;
  const preview =
    settings.systemInstruction.length > 300
      ? `${settings.systemInstruction.slice(0, 300)}…`
      : settings.systemInstruction;

  const embed = Info({
    title: `Botrucho AI — ${enabled ? '🟢 enabled here' : '🔴 disabled here'}`,
    fields: [
      {
        name: 'Model',
        value: [
          `${inlineCode(settings.model)} · thinking ${inlineCode(settings.thinkingLevel)}`,
          `Google Search: ${settings.googleSearch ? '**on** (billed per search)' : 'off'}`,
          `Max input ${number(settings.maxInputChars)} chars · max output ${number(settings.maxOutputTokens)} tokens`,
        ].join('\n'),
      },
      {
        name: 'Limits',
        value: [
          `Cooldown ${limits.userCooldownSec}s · per user ${number(limits.userDaily)}/day · per server ${number(limits.guildDaily)}/day`,
          `Global ${number(limits.globalDaily)} requests/day · ${number(limits.globalDailyTokens)} tokens/day`,
        ].join('\n'),
      },
      {
        name: 'Today (UTC)',
        value: `${number(usage.requests)} requests · ${number(usage.tokens)} tokens · this server ${number(usage.guildRequests)}`,
      },
      { name: 'Instructions', value: preview || '—' },
    ],
  });

  const buttons = [
    new ButtonBuilder()
      .setCustomId(`${AI_SETTINGS_BUTTON}:limits`)
      .setLabel('Limits')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${AI_SETTINGS_BUTTON}:model`)
      .setLabel('Model')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${AI_SETTINGS_BUTTON}:instructions`)
      .setLabel('Instructions')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${AI_SETTINGS_BUTTON}:toggle`)
      .setLabel(enabled ? 'Disable here' : 'Enable here')
      .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success),
  ];

  return {
    embeds: [embed],
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)],
  };
};
