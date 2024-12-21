import { ShardingManager } from "discord.js";
import express from 'express';
import healthRoute from "./routes/health";

import config from "./config";

const app = express();
const port = process.env.PORT || 3000;

const manager = new ShardingManager("./dist/bot.js", {
    token: config.token,
    shardArgs: process.argv,
    totalShards: config.shards ?? "auto",
});

app.use("/", healthRoute);

console.log("[Shards] Starting spawn...");

manager.spawn({ timeout: -1 }).then(() => {
    app.listen(port, () => {
        console.log(`[Express] Bot app listening on port ${ port }`)
    });
});
