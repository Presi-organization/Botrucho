import { WebhookClient, BaseInteraction, TextChannel, APIMessage } from 'discord.js';
import { ThreadAutoArchiveDuration } from "discord-api-types/v10";

/**
 * Retrieves the current Date + one day
 * @return string The formatted date (dd/mm/yyyy)
 */
const getTomorrowsDay: () => string = (): string => {
    const today = new Date();
    today.setDate(today.getDate() + 2);
    const yyyy = today.getFullYear();
    let mm: number | string = today.getMonth() + 1;
    let dd: number | string = today.getDate();
    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;
    return `${ dd }/${ mm }/${ yyyy }`;
}

/**
 * Create a new webhook
 * @arg {BaseInteraction} interaction The interaction object
 */
const createWebhook: (interaction: BaseInteraction) => Promise<void> = async (interaction: BaseInteraction): Promise<void> => {
    (interaction.channel as TextChannel).createWebhook({
        name: 'El-Profe',
        avatar: 'https://imgur.com/NdjTV8f',
    })
        .then(webhook => console.log(`Created webhook ${ webhook }\n ${ webhook.url }`))
        .catch(console.error);
}

/**
 * Edit an existing webhook
 * @arg {WebhookClient} webhook The Webhook client
 */
const editWebhook: (webhook: WebhookClient) => Promise<WebhookClient> = (webhook: WebhookClient): Promise<WebhookClient> => {
    return webhook.edit({
        name: 'Botruchook',
        avatar: 'https://images.deepai.org/art-image/5c017be32cb74260aa1471f36d539b9c/ultimate-frisbee-profile-image-86efab.jpg'
    });
}

/**
 * Send a message with an existing webhook
 * @arg {WebhookClient} webhook The Webhook client
 */
const sendMessageWithWebhook: (webhook: WebhookClient) => Promise<APIMessage> = (webhook: WebhookClient): Promise<APIMessage> => {
    return webhook.send({
        content: `<@&540708709945311243> Asistencia ${ getTomorrowsDay() } <a:frisbeeT:1309633549967556619>`
    });
}

const sendAMessageAndThread: (channel: TextChannel, webhook: WebhookClient) => Promise<void> = async (channel: TextChannel, webhook: WebhookClient): Promise<void> => {
    try {
        const message = await sendMessageWithWebhook(webhook);
        const fetchedMessage = await channel.messages.fetch(message.id);
        const thread = await fetchedMessage.startThread({
            name: `Asistencia ${ getTomorrowsDay() }`,
            autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays,
            reason: 'Diskito en la U'
        });
        const msg = await thread.send({
            content: '<@&540708709945311243>'
        });
        setTimeout(() => msg.delete(), 100);
    } catch (error) {
        console.error('Error trying to send: ', error);
    }
}

export { sendAMessageAndThread, editWebhook }
