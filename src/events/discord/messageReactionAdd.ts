import { EmbedBuilder, MessageReaction, User } from "discord.js";
import { IEventData } from "@mongodb/models/EventData";
import Botrucho from "@mongodb/base/Botrucho";

export async function execute(client: Botrucho, reaction: MessageReaction, user: User) {
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();

    if (user.bot) return;
    if (!reaction.message.guild) return;

    if (reaction.emoji.name === '👽') {
        let eventInfo: IEventData | null = await reaction.message.guild.fetchEventDB(client.eventData, reaction.message.id);
        if (eventInfo) {
            const userFind: string | undefined = eventInfo.userAssisting ? eventInfo.userAssisting.find((userID: string) => userID === user.id) : undefined;
            if (!userFind) {
                await client.eventData.addAssistance(eventInfo.id, user.id);

                const exampleEmbed: EmbedBuilder = new EmbedBuilder()
                    .setColor(client.config.color)
                    .setTitle(`Tu asistencia para el evento ${ eventInfo.eventName }, ha sido confirmada`)
                    .setURL(eventInfo.calendarLink)
                    .setDescription(`Aquí está tu invitación: ${ eventInfo.calendarLink }\n\nTen en cuenta que este mensaje se autodestruirá en 2 minutos.`)
                    .setTimestamp()
                    .setFooter({
                        text: `Evento generado por ${ client.user?.username }`, iconURL: client.user?.displayAvatarURL({
                            size: 512
                        })
                    });

                user.send({
                    embeds: [exampleEmbed]
                })
                    .then(msg => {
                        setTimeout(() => {
                            client.deleted_messages.add(msg);
                        }, 120000)
                    })
                    .catch(() => {
                        console.log('I couldn\'t send a DM');
                    });
            }
        }
    }
}
