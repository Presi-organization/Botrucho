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
import { Info } from '@/utils';

export const AI_SETTINGS_BUTTON = 'ai-settings';
export type AiSettingsAction = 'limits' | 'model' | 'toggle';

export const isAiOwner = (interaction: BaseInteraction): boolean =>
  config.owners.includes(interaction.user.id);

const number = (value: number): string => value.toLocaleString('en-US');

export const buildAiSettingsPanel = async (
  client: Botrucho,
  guildId: string,
  canEdit: boolean,
): Promise<{ embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] }> => {
  const [settings, usage, guildDB] = await Promise.all([
    client.aiSettings.get(),
    client.aiLimiter.usage(guildId),
    client.guildData.showGuild(guildId),
  ]);
  const enabled = !!guildDB?.aiEnabled;
  const { limits } = settings;

  const embed = Info({
    title: `Botrucho AI — ${enabled ? '🟢 enabled here' : '🔴 disabled here'}`,
    fields: [
      {
        name: 'Model',
        value: [
          `${inlineCode(settings.model)} · thinking ${inlineCode(settings.thinkingLevel)} · temperature ${inlineCode(`${settings.temperature}`)}`,
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
      {
        name: 'Instructions',
        value: `From ${inlineCode('assets/ai/system-instruction.md')} (${number(settings.systemInstruction.length)} chars)`,
      },
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
      .setCustomId(`${AI_SETTINGS_BUTTON}:toggle`)
      .setLabel(enabled ? 'Disable here' : 'Enable here')
      .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success),
  ];

  return {
    embeds: [embed],
    components: canEdit ? [new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)] : [],
  };
};
