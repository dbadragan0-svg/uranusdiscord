import type {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
} from "discord.js";

export interface BotCommand {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface CommandContext {
  client: Client;
}