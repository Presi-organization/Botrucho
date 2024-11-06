module.exports = {
    async execute(client, queue, track) {
        if (!queue.metadata || queue.metadata.controller) return console.log("Not metadata");
        const enqueued_message = await queue.metadata.message.translate("MUSIC_ADDED", queue.metadata.guildDB.lang);
        await queue.metadata.last_message.editReply({
            embeds: [
                {
                    color: client.config.color,
                    description: `${ enqueued_message } **[${ track.title }](${ track.url })**`,
                },
            ]
        });
    }
}
