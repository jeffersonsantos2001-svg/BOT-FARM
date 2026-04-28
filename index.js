require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config.json');
const { initDatabase } = require('./src/database/db');
const { registerEvents } = require('./src/handlers/eventHandler');

async function bootstrap() {
  if (!process.env.DISCORD_TOKEN) {
    console.error('ERRO: DISCORD_TOKEN não configurado no .env');
    process.exit(1);
  }

  await initDatabase(config);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.User]
  });

  registerEvents(client);
  await client.login(process.env.DISCORD_TOKEN);
}

bootstrap().catch(err => {
  console.error('[BOOTSTRAP_ERROR]', err);
  process.exit(1);
});
