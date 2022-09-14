const EventDataDAO = require("../models/EventDataDAO");

class EventData {
    /**
     * Handles the various APIs for manage events
     * @param {EventDataDAO} eventDataDAO
     */
    constructor(eventDataDAO) {
        this.eventDataDAO = eventDataDAO;
    }

    async showEvent(serverID, messageID) {
        const querySpec = {
            query: "SELECT * FROM root r WHERE r.serverID=@serverID AND r.messageID=@messageID", parameters: [ {
                name: "@serverID", value: serverID
            }, {
                name: "@messageID", value: messageID
            }, ]
        };

        return this.eventDataDAO.find(querySpec);
    }


    async addEvent(body) {
        await this.eventDataDAO.addItem(body);
    }

    async addAssistance(eventID, userID) {
        const document = await this.eventDataDAO.getItem(eventID);
        document.userAssisting.push(userID);

        await this.eventDataDAO.updateItem(eventID, document);
    }
}

module.exports = EventData;
