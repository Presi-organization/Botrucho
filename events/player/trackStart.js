module.exports = {
    async execute(queue, track, client) {
        if (!queue.metadata) return console.log("Not metadata");
        if (queue.connection.volume === 100) queue.connection.setVolume(queue.metadata.guildDB.defaultVolume);
        const embed = {
            color: client.config.color,
            author: {
                name: "" + track.requestedBy.tag + " - Now playing",
                icon_url: track.requestedBy.displayAvatarURL(),
                url: "https://discord.com/oauth2/authorize?client_id=973290665704308756&scope=bot&permissions=19456"
            },
            description: `[${ track.title }](${ track.url }) [<@${ track.requestedBy.id }>]`,
        };
        if (queue.metadata.controller) {
            return queue.metadata.message.editReply({
                embeds: [ embed ],
            });
        } else {
            if (queue.metadata.guildDB.announce) {
                queue.metadata.message.editReply({
                    embeds: [ embed ],
                });
            }
        }
    }
}
