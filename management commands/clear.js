const clear = async (message) => {
    const args = message.content.split(" ").slice(2);
    const amount = args.join(" ");

    if (!amount) return message.reply('¡No ha proporcionado una cantidad de mensajes que deberían eliminarse!');
    if (isNaN(amount)) return message.reply('¡El parámetro de cantidad no es un número!');

    if (amount > 99) return message.reply('¡No puedes borrar más de 100 mensajes a la vez!');
    if (amount < 1) return message.reply('¡Tienes que borrar al menos 1 mensaje!');

    await message.channel.messages.fetch({ limit: amount }).then(messages => {
        message.channel.bulkDelete(messages);
    });
}

module.exports = { clear }