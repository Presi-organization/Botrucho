const EmbedColor = require('./constants.js');

const Error = (data) => {
    return { embeds: [{ ...data, color: EmbedColor.Error }], ephemeral: false }
}

const Success = (data) => {
    return { embeds: [{ ...data, color: EmbedColor.Success }], ephemeral: false }
}

const Warning = (data) => {
    return { embeds: [{ ...data, color: EmbedColor.Warning }], ephemeral: false }
}

const Info = (data) => {
    return { embeds: [{ ...data, color: EmbedColor.Info }], ephemeral: false }
}

const withEphemeral = (embeds) => {
    return { ...embeds, ephemeral: true }
}

const withFile = (embeds, file) => {
    return { ...embeds, files: [file] }
}

module.exports = {
    Error,
    Success,
    Warning,
    Info,
    withEphemeral,
    withFile
};
