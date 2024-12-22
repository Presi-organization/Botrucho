const { join } = require("path");
const { unlinkSync } = require("node:fs");
const fs = require("node:fs").promises;

module.exports = {
    async execute(client, queue, track) {
        if (queue.metadata.queueTitles.length === 0) {
            if (queue.metadata.queueMessage) {
                queue.metadata.queueMessage.delete();
                queue.metadata.queueMessage = null;
            }
        }
        const audioFile = join(process.cwd(), "/discord/commands/say/voice_speech.wav");
        fs.access(audioFile)
            .then(() => {
                unlinkSync(audioFile);
            })
            .catch((error) => {
                if (error.code !== 'ENOENT') {
                    console.error("An error occurred:", error);
                }
            });
    }
}
