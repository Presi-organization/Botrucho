import { CommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';
import { Info } from "@util/embedMessage";

export const name = 'multas';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('multas')
    .setDescription('Display info about infractions.')
    .addNumberOption(input => input.setName('identification')
        .setDescription('Identification of user to search for infractions')
        .setRequired(true));

export async function execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    let identification: number = interaction.options.getNumber('identification', true);

    await interaction.deferReply();
    //TODO: API CALL
    return interaction.editReply({
        embeds: [Info({
            title: `Multas de la cédula: ${ identification }`,
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
        })]
    });
}
