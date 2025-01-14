import GuildDataModel, { IGuildData } from '@mongodb/models/GuildData';

class GuildDataController {
    async showGuild(guildID: string): Promise<IGuildData | null> {
        return GuildDataModel.findOne({ serverID: guildID }).exec();
    }

    async addGuild(body: IGuildData): Promise<IGuildData> {
        const guild = new GuildDataModel(body);
        return guild.save();
    }

    async setVolume({ guildId, newVolume }: { guildId: string; newVolume: number }): Promise<IGuildData | null> {
        return GuildDataModel.findOneAndUpdate(
            { serverID: guildId },
            { defaultVolume: newVolume },
            { new: true, upsert: true }
        ).exec();
    }

    async setLanguage({ guildId, newLanguage }: { guildId: string; newLanguage: string }): Promise<IGuildData | null> {
        return GuildDataModel.findOneAndUpdate(
            { serverID: guildId },
            { lang: newLanguage },
            { new: true, upsert: true }
        ).exec();
    }
}

export default GuildDataController;
