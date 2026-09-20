import { Events, type Client } from "discord.js";
import { logger } from "../lib/logger.js";
import { findCommand } from "../modules/index.js";

export function registerInteractionHandler(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = findCommand(interaction.commandName);

    if (!command) {
      await interaction.reply({
        content: "Această comandă nu este disponibilă momentan.",
        ephemeral: true,
      });
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error("Command execution failed.", {
        command: interaction.commandName,
        error: error instanceof Error ? error.message : String(error),
      });

      const response = {
        content: "A apărut o eroare la executarea comenzii.",
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(response);
      } else {
        await interaction.reply(response);
      }
    }
  });
}