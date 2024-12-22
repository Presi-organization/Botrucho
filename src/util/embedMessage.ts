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
}

const createEmbedResponse = (data: EmbedData, color: number): EmbedResponse => {
    return { embeds: [{ ...data, color }], ephemeral: false };
};

const Error = (data: EmbedData) => {
    let response = createEmbedResponse(data, EmbedColor.Error);
    return {
        withFile: (file: any) => {
            response.files = [file];
            return response;
        },
        withEphemeral: () => {
            response.ephemeral = true;
            return response;
        },
        getResponse: () => response
    };
};

const Success = (data: EmbedData) => {
    let response = createEmbedResponse(data, EmbedColor.Success);
    return {
        withFile: (file: any) => {
            response.files = [file];
            return response;
        },
        withEphemeral: () => {
            response.ephemeral = true;
            return response;
        },
        getResponse: () => response
    };
};

const Warning = (data: EmbedData) => {
    let response = createEmbedResponse(data, EmbedColor.Warning);
    return {
        withFile: (file: any) => {
            response.files = [file];
            return response;
        },
        withEphemeral: () => {
            response.ephemeral = true;
            return response;
        },
        getResponse: () => response
    };
};

const Info = (data: EmbedData) => {
    let response = createEmbedResponse(data, EmbedColor.Info);
    return {
        withFile: (file: any) => {
            response.files = [file];
            return response;
        },
        withEphemeral: () => {
            response.ephemeral = true;
            return response;
        },
        getResponse: () => response
    };
};

export {
    Error,
    Success,
    Warning,
    Info
};
