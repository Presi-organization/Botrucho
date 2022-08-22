module.exports = {
    async execute(queue, tracks, _) {
        if (!queue.metadata || queue.metadata.controller) return console.log("Not metadata");
        let loadingTest = await queue.metadata.message.translate("ADDS", queue.metadata.guildDB.lang);
        queue.metadata.channel.send(loadingTest.replace("{tracks}", tracks.length));
        if (queue.metadata.guildDB.auto_shuffle) await queue.shuffle().then(queue.metadata.channel.send("`✅` Playlist automaticlly shuffled."));
    }
}
