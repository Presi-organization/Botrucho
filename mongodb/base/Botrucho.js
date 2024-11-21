const { createClientVars } = require("../../util/functions")
const { Player } = require("discord-player");
const util = require("util")
const { Client, Collection } = require("discord.js")

class Botrucho extends Client {
    constructor(options) {
        super(options);
        createClientVars(this).then();
        this.player = new Player(this, {
            skipFFmpeg: false
        });
        this.wait = util.promisify(setTimeout)
        this.queue = new Map()
        this.commands = new Collection()
    }
}

module.exports = Botrucho;
