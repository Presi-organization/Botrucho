import { EmbedBuilder } from "discord.js";
import EmbedColor from '@util/constants';

type EmbedInit = ConstructorParameters<typeof EmbedBuilder>[0];

const createEmbedResponse = (data: EmbedInit, color: number): EmbedBuilder => {
    return new EmbedBuilder(data).setColor(color);
};

export const Error = (data: EmbedInit): EmbedBuilder => createEmbedResponse(data, EmbedColor.Error);
export const Success = (data: EmbedInit): EmbedBuilder => createEmbedResponse(data, EmbedColor.Success);
export const Warning = (data: EmbedInit): EmbedBuilder => createEmbedResponse(data, EmbedColor.Warning);
export const Info = (data: EmbedInit): EmbedBuilder => createEmbedResponse(data, EmbedColor.Info);
