import { APIEmbed, AttachmentBuilder, EmbedBuilder } from "discord.js";
import EmbedColor from '@util/constants';

type EmbedInit = ConstructorParameters<typeof EmbedBuilder>[0];

interface ReplyOptions {
    embeds: Array<APIEmbed>;
    ephemeral?: boolean;
    files?: Array<AttachmentBuilder>;
}

const createEmbedResponse = (data: EmbedInit, color: number): EmbedBuilder => {
    return new EmbedBuilder(data).setColor(color);
};

export const createReplyOptions = (embed: EmbedBuilder, options = {}): ReplyOptions => {
    return {
        embeds: [embed.toJSON()],
        ...options
    };
};

export const Error = (data: EmbedInit): EmbedBuilder => createEmbedResponse(data, EmbedColor.Error);
export const Success = (data: EmbedInit): EmbedBuilder => createEmbedResponse(data, EmbedColor.Success);
export const Warning = (data: EmbedInit): EmbedBuilder => createEmbedResponse(data, EmbedColor.Warning);
export const Info = (data: EmbedInit): EmbedBuilder => createEmbedResponse(data, EmbedColor.Info);
