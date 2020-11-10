const { Readable } = require('stream');
const { simpleEmbedMessage } = require('../embedMessage');

const SILENCE_FRAME = Buffer.from([0xF8, 0xFF, 0xFE]);

class Silence extends Readable {
    _read() {
        this.push(SILENCE_FRAME);
    }
}

const join = (message) => {
    let channelVoice = message.member.voice.channel;
    if (!channelVoice || channelVoice.type !== 'voice') {
        message.channel.send('¡Necesitas unirte a un canal de voz primero!.').catch(error => message.channel.send(error));
    } else if (message.guild.voiceConnection) {
        message.channel.send('Ya estoy conectado en un canal de voz.');
    } else {
        message.channel.send(simpleEmbedMessage(0, 'Conectando...')).then(async (msg) => {
            const connection = await channelVoice.join();
            connection.play(new Silence(), { type: 'opus' });
            msg.edit(simpleEmbedMessage(0, ':white_check_mark: | Conectado exitosamente.'));
        }).catch(error => message.channel.send(error));
    }
}

module.exports = { join }