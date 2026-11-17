import { VoiceState } from 'discord.js';

import { logVoiceActivity } from '@/events/discord/voiceStateHandlers/voice-activity-log.handler';
import { Botrucho } from '@/mongodb';
import { logger } from '@/utils';

export const execute = async (client: Botrucho, oldState: VoiceState, newState: VoiceState) => {
  try {
    logVoiceActivity(oldState, newState);
  } catch (error) {
    logger.error('Error logging voice activity: ', error);
  }
  // await handleClanInvitation(client, oldState, newState);
};
