import { Guild } from "discord.js";
import Botrucho from "@mongodb/base/Botrucho";

export async function execute(client: Botrucho, guild: Guild) {
    const allowedServers: string[] = ['775108414560534588', '381983499005067264'];
    if (!allowedServers.includes(guild.id)) {
        console.log(`Joined an unauthorized server: ${ guild.name } (${ guild.id }). Leaving...`);
        guild.leave()
            .then(() => console.log(`Left server: ${ guild.name }`))
            .catch((error: any) => console.error(`Error leaving server: ${ error.message }`));
    } else {
        console.log(`Joined an authorized server: ${ guild.name }`);
    }
}
