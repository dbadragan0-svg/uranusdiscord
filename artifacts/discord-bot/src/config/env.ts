import "dotenv/config";

export interface BotConfig {
  token: string;
  clientId: string;
  guildId?: string;
  registerCommandsOnStartup: boolean;
  logLevel: string;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env and configure the bot first.`,
    );
  }

  return value;
}

function booleanEnv(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value) {
    return defaultValue;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`Environment variable ${name} must be "true" or "false".`);
}

export function loadConfig(): BotConfig {
  return {
    token: requiredEnv("DISCORD_TOKEN"),
    clientId: process.env["DISCORD_CLIENT_ID"]?.trim() ?? "",
    guildId: process.env["DISCORD_GUILD_ID"]?.trim() || undefined,
    registerCommandsOnStartup: booleanEnv(
      "REGISTER_COMMANDS_ON_STARTUP",
      false,
    ),
    logLevel: process.env["LOG_LEVEL"]?.trim() || "info",
  };
}