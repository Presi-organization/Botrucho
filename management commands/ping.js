const embed = require("../embedMessage");

const ping = (message) => {
    message.channel.send(embed.simpleEmbedMessage(2899536, "**Pinging...**")).then(msg => {
        const ping = msg.createdTimestamp - message.createdTimestamp;
        msg.edit(embed.simpleEmbedMessage(9807270, `**:ping_pong: Pong! LATENCIA:-**\n  ${ping}ms`));
    });
}

module.exports = { ping }