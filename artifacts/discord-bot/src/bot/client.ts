import { Client, GatewayIntentBits } from "discord.js";

export function createBotClient(): Client {
  return new Client({
    intents: [GatewayIntentBits.Guilds],
  });
}