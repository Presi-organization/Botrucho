const resume = async (message, serverQueue) => {
    // Validamos si la cola esta vacía 
    if (!serverQueue) return message.channel.send('¡No hay canción!, la cola esta vacía.');

    if (!message.member.voice.channel) return message.channel.send('debes unirte a un canal de voz.');

    // Reanudamos la canción pausada
    await serverQueue.connection.dispatcher.resume();

    message.channel.send(`Canción actual reanudada.`)
}

module.exports = { resume }