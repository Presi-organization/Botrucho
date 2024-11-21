const { SlashCommandBuilder } = require('@discordjs/builders');
const { Info } = require("../../../util/embedMessage");

module.exports = {
    name: 'multas',
    data: new SlashCommandBuilder()
        .setName('multas')
        .setDescription('Display info about infractions.')
        .addNumberOption(input =>
            input.setName('identification')
                .setDescription('Identification of user to search for infractions')
                .setRequired(true)),
    async execute(interaction) {
        let identification = interaction.options.getNumber('identification');

        await interaction.deferReply('Buscando')

        //TODO: API CALL

        return interaction.editReply(Info({
            title: `Multas de la cédula: ${identification}`,
            description: `Multas por secretaria`,
            fields: [
                {
                    name: 'Sabaneta',
                    value: 'Sí'
                },
                {
                    name: 'Envigado',
                    value: 'No'
                },
                {
                    name: 'Medellín',
                    value: 'Sí'
                },
                {
                    name: 'Bello',
                    value: 'No'
                }
            ]
        }));
    },
};
