module.exports = {
    async execute(message) {
        const { client: { deleted_messages } } = message;
        if (deleted_messages.has(message)) {
            deleted_messages.delete(message);
        }
    }
}
