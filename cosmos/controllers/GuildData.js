const GuildDataDAO = require("../models/GuildDataDAO");

class GuildData {
    /**
     * Handles the various APIs for manage guilds
     * @param {GuildDataDAO} guildDataDAO
     */
    constructor(guildDataDAO) {
        this.guildDataDAO = guildDataDAO;
    }

    async showGuild(guildID) {
        const querySpec = {
            query: "SELECT * FROM root r WHERE r.serverID=@guild_ID", parameters: [ {
                name: "@guild_ID", value: guildID
            } ]
        };

        return this.guildDataDAO.find(querySpec);
    }


    async addGuild(body) {
        await this.guildDataDAO.addItem(body);
    }
}

module.exports = GuildData;
