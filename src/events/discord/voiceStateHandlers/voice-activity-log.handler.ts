import { VoiceState } from 'discord.js';

import { logger } from '@/utils';

export function logVoiceActivity(oldState: VoiceState, newState: VoiceState): void {
  if (!newState.channel?.id) {
    logger.debug(`user ${oldState.member?.displayName} left channel ${oldState.channel?.name}`);
  } else if (!oldState.channel?.id) {
    logger.debug(`user ${newState.member?.displayName} joined channel ${newState.channel?.name}`);
  } else if (oldState.channel.id !== newState.channel.id) {
    logger.debug(
      `user ${newState.member?.displayName} moved channels ${oldState.channel?.name} ${newState.channel?.name}`,
    );
  }
}
