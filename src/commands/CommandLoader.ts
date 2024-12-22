import fs from 'node:fs';
import util from "util";
import { GuildQueueEvents } from "discord-player";
import { Routes } from "discord-api-types/v10";
import { REST } from "@discordjs/rest";
import Botrucho from "@mongodb/base/Botrucho";

const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);

class CommandLoader {
    private readonly client: Botrucho;

    constructor(client: Botrucho) {
        this.client = client;
    }

    async loadCommands() {
        const categories: string[] = (await Promise.all(
            (await readdir(__dirname)).map(async (category) => {
                const categoryPath = `${ __dirname }/${ category }`;
                const stats = await stat(categoryPath);
                return stats.isDirectory() ? category : null;
            })
        )).filter(Boolean) as string[];
        console.log(`[Commands] ${ categories.length } Categories loaded.`, categories);
        const commands: any[] = [];
        for (const category of categories) {
            for (const command_file of (await readdir(`${ __dirname }/${ category }/`)).filter(e => "js" === e.split(".").pop())) {
                const command = require(`${ __dirname }/${ category }/${ command_file }`);
                this.client.commands.set(command.name, command);
                commands.push(command.data.toJSON());
            }
        }

        const rest: REST = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN as string);

        rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID as string, process.env.GUILD_ID as string), { body: commands })
            .then(() => console.log('[Commands] Successfully registered application commands.'))
            .catch(console.error);

        const discord_events: string[] = await readdir(`${__dirname}/../events/discord`);
        discord_events.forEach((discord_event: string) => {
            const event_name: string = discord_event.split(".")[0];
            const event_file = require(`${__dirname}/../events/discord/${ discord_event }`);
            this.client.on(event_name, (...e: any[]) => event_file.execute(this.client, ...e));
            delete require.cache[require.resolve(`${__dirname}/../events/discord/${ discord_event }`)];
        });
        console.log(`[Discord Events] ${ discord_events.length } Discord events loaded.`, discord_events);

        const player_events: string[] = await readdir(`${__dirname}/../events/player`);
        player_events.forEach((player_event: string) => {
            const player_event_name: string = player_event.split(".")[0];
            const player_event_file = require(`${__dirname}/../events/player/${ player_event }`);
            this.client.player.events.on(player_event_name as keyof GuildQueueEvents, (...e: any[]) => player_event_file.execute(this.client, ...e));
            delete require.cache[require.resolve(`${__dirname}/../events/player/${ player_event }`)];
        });
        console.log(`[Player Events] ${ player_events.length } Player events loaded.`, player_events);
    }
}

export default CommandLoader;
