const { Info } = require("../../../util/embedMessage");

module.exports = {
    async execute(client, queue, track) {
        console.log(`Started playing **${track.title}**!`)
        queue.metadata.queueTitles = queue.metadata.queueTitles.slice(1);
        queue.metadata.currentTrack = track;
        const embed = {
            description: `[${ track.title }](${ track.url })`,
            title: 'Now Playing',
            thumbnail: { url: track.thumbnail },
            ...(queue.metadata.queueTitles.length !== 0) && {
                fields: [
                    {
                        name: 'Queue',
                        value: queue.metadata.queueTitles.slice(0, 10).join('\n')
                    }
                ]
            },
            footer: {
                text: `Requested by ${ track.requestedBy?.displayName }`,
                iconURL: track.requestedBy?.displayAvatarURL(),
            },
        };

        if (!queue.metadata.queueMessage) {
            queue.metadata.queueMessage = await queue.metadata.channel.send(Info(embed));
        } else {
            queue.metadata.queueMessage.edit(Info(embed));
        }
    }
}
