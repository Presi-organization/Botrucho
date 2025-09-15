import { Client as DiscordClient, GatewayIntentBits as Intents, Partials, } from 'discord.js';
import mongoose from 'mongoose';
import { ConfigType } from '@/types';
import { logger } from '@/utils';

/**
 * Check the configuration
 * @param config The config.json file
 */
const checkConfig: (config: ConfigType) => Promise<boolean> = async (config: ConfigType): Promise<boolean> => {
  if (!config) {
    logger.error('✗ The provided config is not an object.');
    return true;
  }
  if (config.logAll) logger.log('Starting the verification of the configuration...');
  let error = false;
  if (parseInt(process.version.slice(1).split('.')[0]) < 22) {
    logger.error('✗ NodeJs 22 or higher is required.');
    error = true;
  } else if (!config.owners || config.owners.length === 0) {
    logger.error('✗ The owners array are missing.');
    error = true;
  } else if (!config.footer) {
    logger.error('✗ Please provide a footer.');
    error = true;
  } else if (!config.color) {
    logger.error('✗ Please provide the embeds color.');
    error = true;
  }
  if (!config.defaultLanguage || (config.defaultLanguage.toLowerCase() !== 'en' && config.defaultLanguage.toLowerCase() !== 'es')) {
    logger.error('✗ The default Language parameter is missing or is not supported. Languages: en, es');
    error = true;
  }
  if (typeof config.devMode !== 'boolean') {
    logger.error('✗ The devMode parameter is missing or is not a boolean value');
    error = true;
  }
  if (typeof config.logAll !== 'boolean') {
    logger.error('✗ The logAll parameter is missing or is not a boolean value');
    error = true;
  }
  if (!config.database) {
    logger.error('✗ Your config.js file looks broken. Please reinstall it');
    error = true;
  } else if (typeof config.database.cached !== 'boolean') {
    logger.error('✗ The database.cache parameter is missing or is not a boolean value');
    error = true;
  } else if (isNaN(config.database.delay)) {
    logger.error('✗ The database.delay parameter is missing or is not a number');
    error = true;
  }
  if (!config.token) {
    logger.error('✗ Please provide a discord bot token. Get it at https://discord.com/developers/bots');
    error = true;
  } else {
    const client = new DiscordClient({
      partials: [Partials.Message],
      intents: [Intents.Guilds],
    });
    await client.login(config.token).catch((e: Error) => {
      logger.error('✗ Your token is invalid' + e + '')
      error = true;
    });
  }
  if (!config.database.MongoURL) {
    logger.error('✗ Please provide the url of your mongodb database. You can get it at https://mongodb.org');
    error = true;
  } else {
    await mongoose.connect(config.database.MongoURL).catch(() => {
      logger.error('✗ Your mongodb url isn\'t correct');
      error = true;
    });
  }
  if (error && config.logAll) {
    logger.log('Your config verification has failed. Please fix errors and try again\n\nIf you need more help, join our support server here: https://green-bot.app/discord')
    // Config validation failure should still exit the process as it's a critical startup error
    process.exit(1);
  } else if (config.logAll) logger.log('Your config is correct. Good game 🥳');
  return error;
};

export { checkConfig };
