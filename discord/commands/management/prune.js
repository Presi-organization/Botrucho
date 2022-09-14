const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'prune',
    data: new SlashCommandBuilder()
        .setName('prune')
        .setDescription('Prune up to 99 messages.')
        .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to prune')),
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');

        if (amount <= 1 || amount > 100) {
            return interaction.reply({ content: 'You need to input a number between 1 and 99.', ephemeral: true });
        }
        const { client } = interaction;

        const deletedMessages = client.deleted_messages;

        await interaction.channel.bulkDelete(amount, true).catch(error => {
            console.error(error);
            interaction.reply({
                content: 'There was an error trying to prune messages in this channel!',
                ephemeral: true
            });
        });

        await interaction.reply({ content: `Successfully pruned \`${ amount }\` messages.`, ephemeral: false });
        deletedMessages.add(interaction);
        setTimeout(async () => {
            if (interaction && deletedMessages.has(interaction)) {
                await interaction.deleteReply() && deletedMessages.delete(interaction)
            }
        }, 5000)
    },
};
