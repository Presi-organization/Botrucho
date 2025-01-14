import { EmbedBuilder, MessageReaction, User } from "discord.js";
import { IEventData } from "@mongodb/models/EventData";
import Botrucho from "@mongodb/base/Botrucho";
import { EventKeys, TranslationElement } from "@customTypes/Translations";

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

                const {
                    ASSISTANCE_CONFIRMED,
                    INVITATION_LINK,
                    EVENT_GENERATED
                }: TranslationElement<EventKeys> = await reaction.message.guild.translate("EVENT", client.guildData);

                const exampleEmbed: EmbedBuilder = new EmbedBuilder()
                    .setColor(client.config.color)
                    .setTitle(ASSISTANCE_CONFIRMED.replace("${eventName}", eventInfo.eventName))
                    .setURL(eventInfo.calendarLink)
                    .setDescription(INVITATION_LINK.replace("${calendarLink}", eventInfo.calendarLink))
                    .setTimestamp()
                    .setFooter({
                        text: EVENT_GENERATED.replace("${username}", client.user?.username!),
                        iconURL: client.user?.displayAvatarURL({
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
