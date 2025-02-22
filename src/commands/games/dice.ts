import {
    AttachmentBuilder,
    CommandInteraction,
    EmbedBuilder,
    InteractionCallbackResponse,
    SlashCommandOptionsOnlyBuilder
} from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { IGuildData } from "@mongodb/models/GuildData";
import { DiceKeys, TranslationElement } from "@customTypes/Translations";
import { Info } from "@util/embedMessage";

export const name = 'dice';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll a dice');

export const execute = async (interaction: CommandInteraction, guildDB: IGuildData): Promise<void> => {
    const {
        INITIAL_TITLE,
        ROLL,
        INITIAL_FOOTER,
        RESULT_TITLE,
        RESULT,
        RESULT_FOOTER
    }: TranslationElement<DiceKeys> = interaction.translate("DICE", guildDB.lang);

    const dice: number = Math.floor(Math.random() * 6) + 1;
    const imageAttachment = new AttachmentBuilder('assets/footer/casino.webp', { name: 'dice.webp' });
    const initialEmbed: EmbedBuilder = Info({
        title: INITIAL_TITLE,
        description: ROLL,
        footer: { text: INITIAL_FOOTER, iconURL: "attachment://dice.webp" }
    });

    await interaction.reply({ embeds: [initialEmbed], files: [imageAttachment], withResponse: true })
        .then(async (_: InteractionCallbackResponse) => {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const resultEmbed: EmbedBuilder = Info({
                title: RESULT_TITLE,
                description: RESULT.replace("${dice}", dice.toString()),
                footer: { text: RESULT_FOOTER, iconURL: "attachment://dice.webp" }
            });
            await interaction.editReply({ embeds: [resultEmbed] });
        });
};
