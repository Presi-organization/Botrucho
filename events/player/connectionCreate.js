module.exports = {
    async execute(queue, connection, client) {
        if (!queue.metadata || queue.metadata.controller) return console.log("Not metadata")
        let loadingTest = await queue.metadata.message.translate("JOINED", 'en')
        const deletedMessages = client.deleted_messages;
        queue.metadata.channel.send(
            loadingTest.replace("{channel}", connection.channel.name).replace("{text}", queue.metadata.channel),
        ).then(msg => {
            deletedMessages.add(msg);
            console.log("VoiceConnection - Created")
            setTimeout(async () => {
                if (msg && deletedMessages.has(msg)) {
                    msg.delete() && deletedMessages.delete(msg)
                }
            }, 5000)
        })
    }
}
