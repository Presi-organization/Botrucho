const { Info } = require("@util/embedMessage");

module.exports = {
    async execute(client, queue, track) {
        console.log(`Started playing **${ track.title }**!`)
        queue.metadata.queueTitles = queue.tracks.data.map(track => `[${ track.title } - ${ track.author }](${ track.url })`);
        queue.metadata.currentTrack = track;
        const embed = {
            description: `[${ track.title }](${ track.url })`,
            title: 'Now Playing',
            thumbnail: { url: track.thumbnail },
            ...(queue.metadata.queueTitles.length !== 0) && {
                fields: queue.metadata.queueTitles.reduce((acc, title, index) => {
                    const field = {
                        name: `Song ${index + 1}`,
                        value: title
                    };
                    acc.push(field);
                    return acc;
                }, [])
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