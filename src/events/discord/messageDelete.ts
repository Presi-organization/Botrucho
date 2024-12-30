import { Message } from "discord.js";
import Botrucho from "@mongodb/base/Botrucho";

export async function execute(_: any, message: Message & { client: Botrucho }) {
    const { client: { deleted_messages } } = message;
    if (deleted_messages.has(message)) {
        deleted_messages.delete(message);
    }
}
