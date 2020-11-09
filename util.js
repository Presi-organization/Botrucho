const fs = require('fs');
const request = require("request");
const ffmpeg = require('fluent-ffmpeg');
const WitSpeech = require('node-witai-speech');
const getYoutubeID = require("get-youtube-id");
const {
    content_type
} = require("./settings.json");

//DEV purposes
// const {
//     yt_api_key,
//     wit_api_key
// } = require("./config.json");

const yt_api_key = process.env.YT_API_KEY;
const wit_api_key = process.env.WIT_API_KEY;

exports.getID = (str, cb) => {
    if (isYoutube(str)) {
        cb(getYoutubeID(str));
    }
    else {
        search_video(str, function (id) {
            cb(id);
        });
    }
}

exports.reduceTrailingWhitespace = (string) => {
    for (var i = string.length - 1; i >= 0; i--) {
        if (string.charAt(i) == ' ') string = string.slice(0, i);
        else return string;
    }
    return string;
}

exports.processRawToWav = (filepath, outputpath, cb) => {
    console.log("PAR:", filepath,outputpath)
    fs.closeSync(fs.openSync(outputpath, 'w'));
    var command = ffmpeg(filepath)
        .addInputOptions([
            '-f s32le',
            '-ar 48k',
            '-ac 1'
        ])
        .on('end', function () {
            // Stream the file to be sent to the wit.ai
            var stream = fs.createReadStream(outputpath);

            // Its best to return a promise
            var parseSpeech = new Promise((resolve, reject) => {
                // call the wit.ai api with the created stream
                WitSpeech.extractSpeechIntent(wit_api_key, stream, content_type,
                    (err, res) => {
                        if (err) return reject(err);
                        resolve(res);
                    });
            });

            // check in the promise for the completion of call to witai
            parseSpeech.then((data) => {
                console.log("you said: " + data._text);
                cb(data);
                //return data;
            })
                .catch((err) => {
                    console.log(err);
                    cb(null);
                    //return null;
                })
        })
        .on('error', function (err) {
            console.log('an error happened: ' + err.message);
        })
        .addOutput(outputpath)
        .run();
}

exports.makeDir = (dir) => {
    try {
        fs.mkdirSync(dir);
    } catch (err) { }
}
const isYoutube = (str) => {
    return str.toLowerCase().indexOf("youtube.com") > -1;
}

const search_video = (query, callback) => {
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, (error, response, body) => {
        var json = JSON.parse(body);

        if (json.items[0] == null) {
            callback(null);
        }
        else {
            callback(json.items[0].id.videoId);
        }
    });
}