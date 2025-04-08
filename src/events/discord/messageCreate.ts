import { Message } from "discord.js";
import Botrucho from "@mongodb/base/Botrucho";

export async function execute(client: Botrucho, message: Message) {
    if (message.author.bot) return;

    try {
        if (message.channel.isThread()) {
            const threadId: string = message.channel.id;
            await client.eventAttendanceData.getEventAttendance({ "thread.threadId": threadId });
            await message.delete();
            console.log(`Deleted message from thread ${ threadId }`);
        }
    } catch (error) {
        console.error('Error in messageCreate event: ', error);
    }
}
