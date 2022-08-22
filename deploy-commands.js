const fs = require('node:fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
require('dotenv').config();

const commands = [];
const commandFiles = fs.readdirSync('./commands/music/').filter(file => file.endsWith('play.js'));

for (const file of commandFiles) {
    const command = require(`./commands/music/${ file }`);
    commands.push(command.data.toJSON());
}

console.log(commands)

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands })
    .then(() => console.log('Successfully registered application commands.'))
    .catch(console.error);
