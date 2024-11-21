const GuildData = require('../models/GuildData');

class GuildDataController {
    async showGuild(guildID) {
        return GuildData.findOne({ serverID: guildID });
    }

    async addGuild(body) {
        const guild = new GuildData(body);
        await guild.save();
    }

    async setVolume({ guildID, newVolume }) {
        return GuildData.findOneAndUpdate({ serverID: guildID }, { volume: newVolume }, { new: true, upsert: true });
    }
}

module.exports = GuildDataController;
