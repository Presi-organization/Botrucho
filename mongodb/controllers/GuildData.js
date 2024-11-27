const GuildData = require('../models/GuildData');

class GuildDataController {
    async showGuild(guildID) {
        return GuildData.findOne({ serverID: guildID });
    }

    async addGuild(body) {
        const guild = new GuildData(body);
        await guild.save();
    }

    async setVolume({ guildId, newVolume }) {
        return GuildData.findOneAndUpdate({ serverID: guildId }, { defaultVolume: newVolume }, {
            new: true,
            upsert: true
        });
    }
}

module.exports = GuildDataController;
