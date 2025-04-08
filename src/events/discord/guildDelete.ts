import { Guild } from "discord.js";
import Botrucho from "@mongodb/base/Botrucho";
import { DeleteKeys, TranslationElement } from "@customTypes/Translations";

export async function execute(client: Botrucho, guild: Guild) {
    console.log("\x1b[32m%s\x1b[0m", "OLD GUILD ", "\x1b[0m", `${ guild.name }`);
    const { LEAVE }: TranslationElement<DeleteKeys> = await guild.translate("DELETE", client.guildData);
    await guild.fetchOwner().then(o => {
        const user = client.users.cache.get(o.id);
        if (user) {
            user.send(LEAVE);
        } else {
            console.log("Could not find the user in cache");
        }
    }).catch(err => console.log("Could not dm owner"));
}
