const EventData = require('../models/EventData');

class EventDataController {
    async showEvent(serverID, messageID) {
        return EventData.findOne({ serverID, messageID });
    }

    async addEvent(body) {
        const event = new EventData(body);
        await event.save();
    }

    async addAssistance(eventID, userID) {
        const event = await EventData.findById(eventID).exec();
        if (event) {
            event['userAssisting'].push(userID);
            await event.save();
        }
    }
}

module.exports = EventDataController;
