module.exports = {
    async execute(client, queue, tracks) {
        if (!queue.metadata || queue.metadata.controller) return console.log("Not metadata");
        let loadingTest = await queue.metadata.message.translate("ADDS", queue.metadata.guildDB.lang);
        queue.metadata.last_message.editReply({
            embeds: [
                {
                    color: client.config.color,
                    description: loadingTest.replace("{tracks}", tracks.length),
                },
            ]
        });
        if (queue.metadata.guildDB.auto_shuffle) await queue.shuffle().then(queue.metadata.channel.send("`✅` Playlist automaticlly shuffled."));
    }
}
