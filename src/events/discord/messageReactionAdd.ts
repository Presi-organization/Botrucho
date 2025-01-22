import {
    Channel,
    ChannelType,
    EmbedBuilder,
    MessageReaction,
    TextChannel,
    TextThreadChannel,
    ThreadChannel,
    User
} from "discord.js";
import { IEventData } from "@mongodb/models/EventData";
import Botrucho from "@mongodb/base/Botrucho";
import { IEventAttendance } from "@mongodb/models/EventAttendanceData";
import { EventNotFoundError } from "@errors/EventNotFoundError";
import { UserAlreadyRegisteredError } from "@errors/UserAlreadyRegisteredError";
import { EventKeys, TranslationElement } from "@customTypes/Translations";

async function fetchThreadById(client: Botrucho, threadId: string, channelId: string): Promise<ThreadChannel | null> {
    try {
        const channel: Channel | null = await client.channels.fetch(channelId);

        if (channel?.isTextBased() && channel.type === ChannelType.GuildText) {
            const textChannel = channel as TextChannel;
            const thread: TextThreadChannel | null = await textChannel.threads.fetch(threadId);
            if (thread) return thread;
        }
        console.error('Channel is not a valid text-based channel or thread not found.');
        return null;
    } catch (error) {
        console.trace('Error fetching the thread:', error);
        return null;
    }
}

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

    try {
        await reaction.users.remove(user.id);
        await client.eventAttendanceData.registerUserForEvent(
            reaction.message.id,
            reaction.emoji.name!,
            user.id,
            user.username
        );

        const attendance: IEventAttendance = await client.eventAttendanceData.getEventAttendance({ messageId: reaction.message.id });
        const thread: ThreadChannel<boolean> | null = await fetchThreadById(client, attendance.threadId, reaction.message.channel.id);
        if (thread) {
            await thread.send(`${ user.username } (${ reaction.emoji })`);
        }

        console.log(`User ${ user.username } registered for the event with emoji ${ reaction.emoji.name }`);
    } catch (error: Error | any) {
        switch (error.constructor) {
            case EventNotFoundError:
                await reaction.message.delete();
                await reaction.message.thread?.delete();
                break;
            case UserAlreadyRegisteredError:
                break;
            default:
                console.error('Error handling messageReactionAdd: ', error);
        }
    }
}
