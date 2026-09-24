import {
  ChannelType,
  Events,
} from "discord.js";
import { createBotClient } from "./bot/client.js";
import { registerInteractionHandler } from "./bot/interaction-handler.js";
import { registerCommands } from "./bot/register-commands.js";
import { loadConfig } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { botModules, getAllCommands } from "./modules/index.js";

const LEGIT_CHANNEL_NAME = "「✅」꩜legit";

const LEGIT_MESSAGE = `# __💰 Are We Legit?__
> *Absolutely — our team works every day to keep trades safe, quick, and handled professionally.*

> *Nothing happens behind closed doors. You'll always know exactly what's going on, and you're free to look through past reviews and completed trades before you commit to anything.*

> *Got doubts? Open a ticket and our staff will walk you through it before you send a single cent.*`;

async function sendLegitMessageOnce(
  client: ReturnType<typeof createBotClient>,
): Promise<void> {
  const guild = client.guilds.cache.first();

  if (!guild) {
    logger.warn("Nu am găsit niciun server pentru mesajul Legit.");
    return;
  }

  const legitChannel = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildText &&
      channel.name === LEGIT_CHANNEL_NAME,
  );

  if (!legitChannel || legitChannel.type !== ChannelType.GuildText) {
    logger.warn(
      `Canalul ${LEGIT_CHANNEL_NAME} nu a fost găsit.`,
    );
    return;
  }

  try {
    const messages = await legitChannel.messages.fetch({
      limit: 100,
    });

    const alreadyExists = messages.some(
      (message) =>
        message.author.id === client.user.id &&
        message.content.includes("# __💰 Are We Legit?__"),
    );

    if (alreadyExists) {
      logger.info(
        "Mesajul Legit există deja. Nu trimit un duplicat.",
      );
      return;
    }

    await legitChannel.send({
      content: LEGIT_MESSAGE,
    });

    logger.info("Mesajul Legit a fost trimis cu succes.");
  } catch (error) {
    logger.error("Nu am putut trimite mesajul Legit.", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function start(): Promise<void> {
  const config = loadConfig();
  const client = createBotClient();
  const commands = getAllCommands();

  registerInteractionHandler(client);

  for (const module of botModules) {
    module.registerEvents(client);
  }

  client.once(Events.ClientReady, async (readyClient) => {
    logger.info(`Logged in as ${readyClient.user.tag}.`, {
      modules: botModules.map((module) => module.name),
      commands: commands.map((command) => command.data.name),
    });

    await sendLegitMessageOnce(readyClient);
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