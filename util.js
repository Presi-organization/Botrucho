const request = require("request");
const getYoutubeID = require("get-youtube-id");
const {
    yt_api_key,
} = require("./settings.json");

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