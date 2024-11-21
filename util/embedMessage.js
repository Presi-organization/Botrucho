const EmbedColor = require('./constants.js');

const Error = (data) => {
    return { embeds: [{ ...data, color: EmbedColor.Error }] }
}

const Success = (data) => {
    return { embeds: [{ ...data, color: EmbedColor.Success }] }
}

const Warning = (data) => {
    return { embeds: [{ ...data, color: EmbedColor.Warning }] }
}

const Info = (data) => {
    return { embeds: [{ ...data, color: EmbedColor.Info }] }
}

module.exports = {
    Error,
    Success,
    Warning,
    Info
};
