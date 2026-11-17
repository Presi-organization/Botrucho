import { APIMessage, BaseInteraction, TextChannel, WebhookClient } from 'discord.js';

import { logger } from '@/utils';

const WEBHOOK_NAME = 'Botruchook';
const WEBHOOK_AVATAR =
  'https://images.deepai.org/art-image/5c017be32cb74260aa1471f36d539b9c/ultimate-frisbee-profile-image-86efab.jpg';

/**
 * Create a new webhook
 * @arg {BaseInteraction} interaction The interaction object
 */
export const createWebhook = async (interaction: BaseInteraction): Promise<void> => {
  (interaction.channel as TextChannel)
    .createWebhook({ name: WEBHOOK_NAME, avatar: WEBHOOK_AVATAR })
    .then((webhook) => logger.log(`Created webhook ${webhook.id}`))
    .catch(logger.error);
};

/**
 * Edit an existing webhook
 * @arg {WebhookClient} webhook The Webhook client
 */
export const editWebhook = (webhook: WebhookClient): Promise<WebhookClient> => {
  return webhook.edit({ name: WEBHOOK_NAME, avatar: WEBHOOK_AVATAR });
};

/**
 * Send a message with an existing webhook
 * @arg {WebhookClient} webhook The Webhook client
 * @arg {string} webhookTitle The title of the webhook message
 */
export const sendMessageWithWebhook = (
  webhook: WebhookClient,
  webhookTitle: string,
): Promise<APIMessage> => {
  return webhook.send({ content: webhookTitle });
};
