const { join } = require("path");
const { unlinkSync } = require("node:fs");

module.exports = {
    async execute(_) {
        console.log("[idle]");
        const audioFile = join(process.cwd(), "/discord/commands/say/voice_speech.wav");
        unlinkSync(audioFile);
    }
}
