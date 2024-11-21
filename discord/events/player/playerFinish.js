const { Success, Info } = require("../../../util/embedMessage");

module.exports = {
    async execute(client, queue, track) {
        if (queue.metadata.queueMessage) {
            queue.metadata.queueMessage.delete();
            queue.metadata.queueMessage = null;
        }
    }
}
