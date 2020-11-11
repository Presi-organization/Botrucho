const volume = async (message, serverQueue) => {
    const args = message.content.split(" ").slice(2);
    const amount = args.join(" ");
    // Validamos si la cola esta vacía 
    if (!serverQueue) return message.channel.send('¡No hay canción!, la cola esta vacía.');
    if (!amount) return message.channel.send('Agrege el volumen entre **1 a 100%**')

    // Creamos una variable para el porcentaje del volumen
    let countVolumen = parseInt(amount);
    if (countVolumen <= 100) {
        let dispatcher = serverQueue.connection.dispatcher;
        // Modificamos el volumen de la canción en reproducción
        await dispatcher.setVolume(Math.min((dispatcher.volume = countVolumen / 50)))
        message.channel.send(`**Volume:** \`${Math.round(dispatcher.volume * 50)}\`**%**`)
    } else {
        message.channel.send('El volumen debe estar entre **1 a 100%**')
    }
}

module.exports = { volume }