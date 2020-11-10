const pause = async (message, serverQueue) => {
    // Validamos si la cola esta vacía 
    if (!serverQueue) return message.channel.send('¡No hay canción!, la cola esta vacía.');
    if (!message.member.voice.channel) return message.channel.send('debes unirte a un canal de voz.');

    // Pausamos la canción en reproducción
    await serverQueue.connection.dispatcher.pause();

    message.channel.send(`Canción actual en pausa.`);
}

module.exports = { pause }