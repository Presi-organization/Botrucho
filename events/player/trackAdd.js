module.exports = {
    async execute(queue, track, client) {
        if (!queue.metadata || queue.metadata.controller) return console.log("Not metadata");
        const enqueued_message = await queue.metadata.message.translate("MUSIC_ADDED", queue.metadata.guildDB.lang);
        await queue.metadata.message.editReply({
            embeds: [
                {
                    color: client.config.color,
                    description: `${ enqueued_message } **[${ track.title }](${ track.url })**`,
                },
            ],
            ephemeral: true
        });
    }
}
