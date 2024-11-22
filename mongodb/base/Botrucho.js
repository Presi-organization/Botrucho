const { Player } = require("discord-player");
const { Client, Collection } = require("discord.js")
const { createAudioPlayer, NoSubscriberBehavior } = require("discord-voip");
const { createClientVars } = require("../../util/functions")

class Botrucho extends Client {
    config;
    color;
    owners;
    footer;
    defaultLanguage;
    log;
    devMode;
    deleted_messages = new WeakSet();
    player = new Player(this);
    playerSay = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Stop,
        }
    });

    constructor(options) {
        super(options);
        createClientVars(this);
        this.queue = new Map()
        this.commands = new Collection()
    }
}

module.exports = Botrucho;
