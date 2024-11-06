const Discord = require("discord.js");

exports.simpleEmbedMessage = (color, message) => {
    return ({
        embed: {
            color: color,
            description: message
        }
    })
};

exports.richEmbedMessage = (message) => {
    return new Discord.RichEmbed()
        .setTitle("Este es su título, puede contener 256 caracteres")
        .setAuthor(message.author.username, message.author.avatarURL)
        .setColor(0x00AE86)
        .setDescription("Este es el cuerpo principal del texto, puede contener 2048 caracteres.")
        .setFooter("Pie de página, puede contener 2048 caracteres", client.user.avatarURL)
        .setImage(message.author.avatarURL)
        .setThumbnail(message.author.avatarURL)
        .setTimestamp()
        .setURL("https://github.com/CraterMaik")
        .addField("Este es un título de campo, puede contener 256 caracteres",
            "Este es un valor de campo, puede contener 2048 caracteres.")
        .addField("Campo en línea", "Debajo del campo en línea", true)
        .addBlankField(true)
        .addField("Campo en línea 3", "Puede tener un máximo de 25 campos.", true);
};
