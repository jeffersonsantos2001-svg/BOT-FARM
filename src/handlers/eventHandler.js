const ready = require('../events/ready');
const messageDelete = require('../events/messageDelete');
const { handleInteraction } = require('./interactionHandler');

function registerEvents(client) {
  client.once('ready', () => ready(client));
  client.on('interactionCreate', handleInteraction);
  client.on('messageDelete', messageDelete);
  process.on('unhandledRejection', err => console.error('[UNHANDLED_REJECTION]', err));
  process.on('uncaughtException', err => console.error('[UNCAUGHT_EXCEPTION]', err));
}

module.exports = { registerEvents };
