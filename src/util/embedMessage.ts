import { Colors, EmbedBuilder } from "discord.js";

type EmbedInit = ConstructorParameters<typeof EmbedBuilder>[0];

const createEmbedResponse = (data: EmbedInit, color: number): EmbedBuilder => {
    return new EmbedBuilder(data).setColor(color);
};

export const Error = (data: EmbedInit): EmbedBuilder => createEmbedResponse(data, Colors.LuminousVividPink);
export const Success = (data: EmbedInit): EmbedBuilder => createEmbedResponse(data, Colors.Green);
export const Warning = (data: EmbedInit): EmbedBuilder => createEmbedResponse(data, Colors.Gold);
export const Info = (data: EmbedInit): EmbedBuilder => createEmbedResponse(data, Colors.Aqua);
