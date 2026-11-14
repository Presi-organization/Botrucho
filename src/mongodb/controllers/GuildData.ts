import { GuildDataModel, IGuildData } from '@/mongodb';

export class GuildDataController {
  async showGuild(guildID: string): Promise<IGuildData | null> {
    return GuildDataModel.findOne({ serverID: guildID }).exec();
  }

  async addGuild(body: IGuildData): Promise<IGuildData> {
    const guild = new GuildDataModel(body);
    return guild.save();
  }

  async setVolume({
    guildId,
    newVolume,
  }: {
    guildId: string;
    newVolume: number;
  }): Promise<IGuildData | null> {
    return GuildDataModel.findOneAndUpdate(
      { serverID: guildId },
      { defaultVolume: newVolume },
      { returnDocument: 'after', upsert: true },
    ).exec();
  }

  async setAiEnabled(guildId: string, aiEnabled: boolean): Promise<IGuildData | null> {
    return GuildDataModel.findOneAndUpdate(
      { serverID: guildId },
      { aiEnabled },
      { returnDocument: 'after', upsert: true },
    ).exec();
  }

  async setFootballChannel(guildId: string, channelId: string | null): Promise<IGuildData | null> {
    return GuildDataModel.findOneAndUpdate(
      { serverID: guildId },
      { footballChannelID: channelId },
      { returnDocument: 'after', upsert: true },
    ).exec();
  }

  async setFootballLastPostDate(guildId: string, dateKey: string): Promise<void> {
    await GuildDataModel.updateOne({ serverID: guildId }, { footballLastPostDate: dateKey }).exec();
  }

  async getFootballChannels(): Promise<
    Pick<IGuildData, 'serverID' | 'footballChannelID' | 'footballLastPostDate'>[]
  > {
    return GuildDataModel.find({ footballChannelID: { $nin: [null, ''] } })
      .select('serverID footballChannelID footballLastPostDate')
      .lean();
  }

  async setLanguage({
    guildId,
    newLanguage,
  }: {
    guildId: string;
    newLanguage: string;
  }): Promise<IGuildData | null> {
    return GuildDataModel.findOneAndUpdate(
      { serverID: guildId },
      { lang: newLanguage },
      { returnDocument: 'after', upsert: true },
    ).exec();
  }
}
