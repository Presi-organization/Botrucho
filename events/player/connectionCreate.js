module.exports = {
    async execute(queue, connection, client) {
        if (!queue.metadata || queue.metadata.controller) return console.log("Not metadata")
        let loadingTest = await queue.metadata.message.translate("JOINED", 'en')
        queue.metadata.message.editReply({
            embeds: [
                {
                    color: client.config.color,
                    description: loadingTest.replace("{channel}", connection.channel.name).replace("{text}", queue.metadata.channel),
                },
            ]
        });
    }
}
