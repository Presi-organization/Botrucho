const debug = require("debug")('GUILDDATA_MODEL');
const CosmosClient = require('@azure/cosmos').CosmosClient;
const { defaultLanguage } = require("../../config");

class GuildDataDAO {
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
     * @param {Object} item
     * @return {Promise<any>}
     */
    async addItem(item) {
        debug('Adding an item to the database')
        const guild = Object.assign({
            lang: defaultLanguage.toLowerCase(),
            premium: null,
            premiumUserID: null,
            chatbot: null,
            ignored_channel: null,
            admin_role: null,
            goodPremium: null,
            requestChannel: null,
            requestMessage: null,
            defaultVolume: 60,
            vc: null,
            auto_shuffle: null,
            games_enabled: null,
            util_enabled: null,
            autorole: null,
            autorole_bot: null,
            dj_role: null,
            count: null,
            autopost: null,
            suggestions: null,
            color: null,
            backlist: null,
            autonick: null,
            autonick_bot: null,
            autoplay: null,
            song: null,
            h24: null,
            announce: null,
            plugins: {
                welcome: {
                    status: false,
                    message: null,
                    channel: null,
                    image: false
                },
                goodbye: {
                    status: false,
                    message: null,
                    channel: null,
                    image: false
                },
                autoping: {
                    status: false,
                    message: null,
                    channel: null,
                    image: false
                }
            },
            protections: {
                anti_maj: {
                    status: false,
                    message: null,
                    channel: null,
                    image: false
                },
                anti_spam: {
                    status: false,
                    message: null,
                    channel: null,
                    image: false
                },
                anti_mentions: {
                    status: false,
                    message: null,
                    channel: null,
                    image: false
                },
                anti_dc: {
                    status: false,
                    message: null,
                    channel: null,
                    image: false
                },
                anti_pub: null,
                antiraid_logs: null
            }
        }, item);
        const { resource: doc } = await this.container.items.create({ ...guild })
        return doc
    }

    async updateItem(itemId) {
        debug('Update an item in the database')
        const doc = await this.getItem(itemId)

        const { resource: replaced } = await this.container
            .item(itemId)
            .replace(doc)
        return replaced
    }

    async getItem(itemId) {
        debug('Getting an item from the database')
        const { resource } = await this.container.item(itemId).read()
        return resource
    }
}

module.exports = GuildDataDAO;
