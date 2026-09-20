import { Events } from "discord.js";
import { createBotClient } from "./bot/client.js";
import { registerInteractionHandler } from "./bot/interaction-handler.js";
import { registerCommands } from "./bot/register-commands.js";
import { loadConfig } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { botModules, getAllCommands } from "./modules/index.js";

async function start(): Promise<void> {
  const config = loadConfig();
  const client = createBotClient();
  const commands = getAllCommands();

  registerInteractionHandler(client);

  for (const module of botModules) {
    module.registerEvents(client);
  }

  client.once(Events.ClientReady, (readyClient) => {
    logger.info(`Logged in as ${readyClient.user.tag}.`, {
      modules: botModules.map((module) => module.name),
      commands: commands.map((command) => command.data.name),
    });
  });

  if (config.registerCommandsOnStartup) {
    await registerCommands(config, commands);
  }

  await client.login(config.token);

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}; shutting down.`);
    client.destroy();
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error: unknown) => {
  logger.error("Bot startup failed.", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});