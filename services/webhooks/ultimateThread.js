const { WebhookClient, BaseInteraction } = require('discord.js');
const { ThreadAutoArchiveDuration } = require("discord-api-types/v10");

/**
 * Retrieves the current Date + one day
 * @return string The formatted date (dd/mm/yyyy)
 * */
const getTomorrowsDay = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1)
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1;
    let dd = today.getDate();
    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;
    return dd + '/' + mm + '/' + yyyy;
}

/**
 * Edit an existing webhook
 * @arg {BaseInteraction} interaction The Webhook client
 * */
const createWebhook = async (interaction) => {
    interaction.channel.createWebhook({
        name: 'El-Profe',
        avatar: 'https://imgur.com/NdjTV8f',
    })
        .then(webhook => console.log(`Created webhook ${ webhook }\n ${ webhook.url }`))
        .catch(console.error);
}

/**
 * Edit an existing webhook
 * @arg {WebhookClient} webhook The Webhook client
 * */
const editWebhook = (webhook) => {
    return webhook.edit({
        name: 'Mr. Botrucho',
        avatar: 'https://imgur.com/NdjTV8f.png'
    });
}

/**
 * Send a message with an existing webhook
 * @arg {WebhookClient} webhook The Webhook client
 * */
const sendMessageWithWebhook = (webhook) => {
    return webhook.send({
        content: `<@&540708709945311243> Asistencia ${ getTomorrowsDay() }`
    });
}

const sendAMessageAndThread = (channel, webhook) => {
    try {
        sendMessageWithWebhook(webhook).then((message) => {
            channel.messages.fetch(message.id).then(message => {
                return message.startThread({
                    name: '¿Quién cae?',
                    autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays,
                    reason: '@Bots',
                });
            });
        });
    } catch (error) {
        console.error('Error trying to send: ', error);
    }
}

module.exports = { sendAMessageAndThread }
