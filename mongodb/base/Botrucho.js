const { Player } = require("discord-player");
const { Client, Collection } = require("discord.js")
const { createClientVars } = require("../../util/functions")

class Botrucho extends Client {
    config;
    color;
    owners;
    footer;
    defaultLanguage;
    log;
    devMode;
    deleted_messages = new Set();
    player = new Player(this);

    constructor(options) {
        super(options);
        createClientVars(this);
        this.queue = new Map()
        this.commands = new Collection()
    }
}

module.exports = Botrucho;
