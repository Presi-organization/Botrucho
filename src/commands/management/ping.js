const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'ping',
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction) {
        const ping = Math.abs(Date.now() - interaction.createdTimestamp);

        /*let member = interaction.channel.guild.roles.cache.get("1014336642825322660").members.first();
        if (member) {
            let botRole = interaction.channel.guild.roles.cache.get("540708709945311243");
            member.roles.add(botRole)
                .then(() => interaction.reply({ content: 'Given', ephemeral: true }))
                .catch(console.error);
        }*/

        return interaction.reply({ content: `**:ping_pong: Pong!!!**\n${ ping }ms`, ephemeral: true });
    },
};
