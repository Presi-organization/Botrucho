export async function execute(client, guild) {
    console.log("[32m%s[0m", "OLD GUILD ", "[0m", `${ guild.name }`);
    await guild.fetchOwner().then(o => {
        client.users.cache.get(o.id).send(`:broken_heart: | I'm sad to see that you no longer need me in your server`);
    }).catch(err => console.log("Could not dm owner"));

}
