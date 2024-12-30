import { Guild } from "discord.js";
import Botrucho from "@mongodb/base/Botrucho";

export async function execute(client: Botrucho, guild: Guild) {
    console.log("\x1b[32m%s\x1b[0m", "OLD GUILD ", "\x1b[0m", `${ guild.name }`);
    await guild.fetchOwner().then(o => {
        const user = client.users.cache.get(o.id);
        if (user) {
            user.send(`:broken_heart: | I'm sad to see that you no longer need me in your server`);
        } else {
            console.log("Could not find the user in cache");
        }
    }).catch(err => console.log("Could not dm owner"));
}
