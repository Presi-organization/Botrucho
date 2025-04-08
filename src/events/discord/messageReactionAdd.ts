import { MessageReaction, User } from "discord.js";
import Botrucho from "@mongodb/base/Botrucho";
import AttendanceReactionHandler from "@events/discord/reactionHandlers/AttendanceReactionHandler";
import EventHandler from "@events/discord/reactionHandlers/EventHandler";

export const execute = async (client: Botrucho, reaction: MessageReaction, user: User) => {
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();

    if (user.bot) return;
    if (!reaction.message.guild) return;

    const attendanceReactionHandler: AttendanceReactionHandler = new AttendanceReactionHandler(client);
    const eventHandler: EventHandler = new EventHandler(client, reaction, user);

    await eventHandler.handleEventReaction();
    await attendanceReactionHandler.handleAttendanceReaction(reaction, user);
};
