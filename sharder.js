const { ShardingManager } = require("discord.js");
const { token, shards } = require("./config");
const express = require('express');
const app = express();

const port = process.env.PORT || 3000;

const manager = new ShardingManager("./bot.js", {
    token: token,
    shardArgs: process.argv,
    totalShards: shards ?? "auto",
});

app.use("/", require("./routes/health"));

console.log("[Shards] Starting spawn...");

manager.spawn({ timeout: -1 }).then(() => {
    app.listen(port, () => {
        console.log(`[Express] Bot app listening on port ${ port }`)
    });
});
