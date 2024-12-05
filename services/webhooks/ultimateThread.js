const { WebhookClient, BaseInteraction } = require('discord.js');
const { ThreadAutoArchiveDuration } = require("discord-api-types/v10");

/**
 * Retrieves the current Date + one day
 * @return string The formatted date (dd/mm/yyyy)
 * */
const getTomorrowsDay = () => {
    const today = new Date();
    today.setDate(today.getDate() + 2)
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
        name: 'Botruchook',
        avatar: 'https://images.deepai.org/art-image/5c017be32cb74260aa1471f36d539b9c/ultimate-frisbee-profile-image-86efab.jpg'
    });
}

/**
 * Send a message with an existing webhook
 * @arg {WebhookClient} webhook The Webhook client
 * */
const sendMessageWithWebhook = (webhook) => {
    return webhook.send({
        content: `<@&540708709945311243> Asistencia ${ getTomorrowsDay() } <a:frisbeeT:1309633549967556619>`
    });
}

const sendAMessageAndThread = (channel, webhook) => {
    try {
        sendMessageWithWebhook(webhook).then((message) => {
            channel.messages.fetch(message.id).then(message => {
                return message.startThread({
                    name: `Asistencia ${ getTomorrowsDay() }`,
                    autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays,
                    reason: 'Diskito en la U'
                }).then(thread => {
                    thread.send({
                        content: '<@&540708709945311243>'
                    }).then(msg => {
                        setTimeout(() => msg.delete(), 100);
                    });
                });
            });
        });
    } catch (error) {
        console.error('Error trying to send: ', error);
    }
}

module.exports = { sendAMessageAndThread, editWebhook }
