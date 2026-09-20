import { REST, Routes } from "discord.js";
import type { BotConfig } from "../config/env.js";
import { logger } from "../lib/logger.js";
import type { BotCommand } from "../commands/types.js";

export async function registerCommands(
  config: BotConfig,
  commands: BotCommand[],
): Promise<void> {
  if (!config.clientId) {
    throw new Error(
      "DISCORD_CLIENT_ID is required when REGISTER_COMMANDS_ON_STARTUP=true.",
    );
  }

  const rest = new REST({ version: "10" }).setToken(config.token);
  const commandData = commands.map((command) => command.data.toJSON());
  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);

  await rest.put(route, { body: commandData });

  logger.info("Slash commands registered.", {
    scope: config.guildId ? "guild" : "global",
    count: commandData.length,
  });
}