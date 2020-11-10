const listQueue = (message, serverQueue) => {
    if (!serverQueue) return message.channel.send('¡No hay canción que mostrar!, la cola esta vacía');
    let i = 1

    // Listamos las canciones de la cola
    let list = serverQueue.songs.slice(1).map((m) => {
        if (i > 16) return // Lista solo 15 canciones
        i++;
        return `[${i}] - 🎵 ${m.title}  / 👤 por: ${m.author}` // Construimos la info por cada canción

    }).join('\n')

    let hr = "---------------------------------------------"
    // El tiempo de reproduccion de la canción
    let time = Math.trunc(serverQueue.connection.dispatcher.streamTime / 1000)

    // Agregarmos la canción actual reproduciendo
    let playName = `${hr}\n🔊 Ahora: ${serverQueue.songs[0].title}\n🕐 Tiempo: ${time} segundos.\n👤 Por: ${serverQueue.songs[0].author}\n${hr}`
    // La cantidad de canciones encontradas
    let countSong = `\n${hr}\n📒 Lista ${serverQueue.songs.length}/15 canciones.`

    message.channel.send('```xl\n[LISTA DE CANCIONES PARA: ' + message.guild.name.toUpperCase() + ']\n' + playName + '\n\n' + list + '\n' + countSong + '\n```')
}

module.exports = { listQueue }