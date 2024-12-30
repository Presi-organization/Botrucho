import { EmbedBuilder } from "discord.js";
import EmbedColor from '@util/constants';

type EmbedInit = ConstructorParameters<typeof EmbedBuilder>[0];

interface EmbedResponse {
    embeds: EmbedInit[];
    ephemeral?: boolean;
    files?: any[];
    withFile?: (file: any) => EmbedResponse;
    withEphemeral?: () => EmbedResponse;
}

const createEmbedResponse: (data: EmbedInit, color: number) => EmbedResponse = (data: EmbedInit, color: number): EmbedResponse => {
    let response: EmbedResponse = { embeds: [{ ...data, color }], ephemeral: false };

    response.withFile = (file: any): EmbedResponse => {
        response.files = [file];
        return response;
    };

    response.withEphemeral = (): EmbedResponse => {
        response.ephemeral = true;
        return response;
    };

    return response;
};

const Error: (data: EmbedInit) => EmbedResponse = (data: EmbedInit): EmbedResponse => createEmbedResponse(data, EmbedColor.Error);
const Success: (data: EmbedInit) => EmbedResponse = (data: EmbedInit): EmbedResponse => createEmbedResponse(data, EmbedColor.Success);
const Warning: (data: EmbedInit) => EmbedResponse = (data: EmbedInit): EmbedResponse => createEmbedResponse(data, EmbedColor.Warning);
const Info: (data: EmbedInit) => EmbedResponse = (data: EmbedInit): EmbedResponse => createEmbedResponse(data, EmbedColor.Info);

export {
    Error,
    Success,
    Warning,
    Info
};
