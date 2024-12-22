module.exports = {
    async execute(client, queue, _oldVolume, newVolume) {
        const { guildData } = client;
        const guildId = queue.guild.id;

        await guildData.setVolume({ guildId, newVolume });
    }
}
