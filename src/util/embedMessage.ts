import EmbedColor from '@util/constants';

interface EmbedData {
    title?: string;
    description?: string;
    color?: number;
    fields?: { name: string; value: string; inline?: boolean }[];
    footer?: { text: string; icon_url?: string };
    timestamp?: Date;
}

interface EmbedResponse {
    embeds: EmbedData[];
    ephemeral?: boolean;
    files?: any[];
    withFile?: (file: any) => EmbedResponse;
    withEphemeral?: () => EmbedResponse;
}

const createEmbedResponse = (data: EmbedData, color: number): EmbedResponse => {
    let response: EmbedResponse = { embeds: [{ ...data, color }], ephemeral: false };

    response.withFile = (file: any) => {
        response.files = [file];
        return response;
    };

    response.withEphemeral = () => {
        response.ephemeral = true;
        return response;
    };

    return response;
};

const Error = (data: EmbedData): EmbedResponse => createEmbedResponse(data, EmbedColor.Error);
const Success = (data: EmbedData): EmbedResponse => createEmbedResponse(data, EmbedColor.Success);
const Warning = (data: EmbedData): EmbedResponse => createEmbedResponse(data, EmbedColor.Warning);
const Info = (data: EmbedData): EmbedResponse => createEmbedResponse(data, EmbedColor.Info);

export {
    Error,
    Success,
    Warning,
    Info
};
