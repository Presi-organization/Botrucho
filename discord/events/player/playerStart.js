const { Info } = require("../../../util/embedMessage");

module.exports = {
    async execute(client, queue, track) {
        const embed = {
            author: {
                name: "" + track.requestedBy.tag + " - Now playing",
                icon_url: track.requestedBy.displayAvatarURL(),
                url: "https://discord.com/oauth2/authorize?client_id=973290665704308756&scope=bot&permissions=19456"
            },
            description: `[${ track.title }](${ track.url }) [<@${ track.requestedBy.id }>]`,
        };
        queue.metadata.message.editReply(Info(embed));
    }
}
