const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'prune',
    data: new SlashCommandBuilder()
        .setName('prune')
        .setDescription('Prune up to 99 messages.')
        .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to prune')),
    async execute(interaction, guildDB) {
        const amount = interaction.options.getInteger('amount');

        if (amount < 1 || amount > 100) {
            return interaction.reply({
                content: interaction.translate("PRUNE_AMOUNT_ERR", guildDB.lang),
                ephemeral: true
            });
        }
        const { client } = interaction;

        const deletedMessages = client.deleted_messages;

        await interaction.channel.bulkDelete(amount, true).catch(error => {
            console.error(error);
            interaction.reply({
                content: interaction.translate("PRUNE_ERR", guildDB.lang),
                ephemeral: true
            });
        });

        await interaction.reply({
            content: interaction.translate("PRUNE_SUCC", guildDB.lang).replace("${amount}", amount),
            ephemeral: false
        });
        deletedMessages.add(interaction);
    },
};
