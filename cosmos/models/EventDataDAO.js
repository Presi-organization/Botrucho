const debug = require("debug")('EVENTDATA_MODEL');
const CosmosClient = require('@azure/cosmos').CosmosClient;

class EventDataDAO {
    /**
     * Manages reading, creating and updating events in Cosmos DB
     * @param {CosmosClient} cosmosClient
     * @param {string} databaseID
     * @param {string} containerID
     */
    constructor(cosmosClient, databaseID, containerID) {
        this.client = cosmosClient
        this.databaseID = databaseID
        this.containerID = containerID
    }

    async init() {
        debug('Setting up the database...')
        const dbResponse = await this.client.databases.createIfNotExists({
            id: this.databaseID
        })
        this.database = dbResponse.database
        debug('Setting up the database...done!')
        debug('Setting up the container...')
        const coResponse = await this.database.containers.createIfNotExists({
            id: this.containerID
        })
        this.container = coResponse.container
        debug('Setting up the container...done!')
    }

    async find(querySpec) {
        debug('Querying for items from the database')
        if (!this.container) {
            throw new Error('Collection is not initialized.')
        }
        const { resources } = await this.container.items.query(querySpec).fetchAll()
        return resources
    }

    /**
     *
     * @param {{serverID: string, messageID: string, eventName:string, calendarLink: string, userAssisting?: [string], creation_date?: number}} item
     * @return {Promise<any>}
     */
    async addItem(item) {
        debug('Adding an item to the database')
        const event = Object.assign({
            userAssisting: [],
            creation_date: Date.now()
        }, item)
        const { resource: doc } = await this.container.items.create({ ...event })
        return doc
    }

    async updateItem(itemId, document) {
        debug('Update an item in the database')
        const { resource: replaced } = await this.container
            .item(itemId)
            .replace(document)
        return replaced
    }

    async getItem(itemId) {
        debug('Getting an item from the database')
        const { resource } = await this.container.item(itemId).read()
        return resource
    }
}

module.exports = EventDataDAO;
