const GuildData = require('../models/GuildData');

class GuildDataController {
    async showGuild(guildID) {
        return await GuildData.findOne({ serverID: guildID });
    }

    async addGuild(body) {
        const guild = new GuildData(body);
        await guild.save();
    }
}

module.exports = GuildDataController;
