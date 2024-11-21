const { createClientVars } = require("../../util/functions")
const util = require("util")
const { Client, Collection } = require("discord.js")

class Botrucho extends Client {
    constructor(options) {
        super(options);
        createClientVars(this).then();
        this.wait = util.promisify(setTimeout)
        this.queue = new Map()
        this.commands = new Collection()
    }
}

module.exports = Botrucho;
