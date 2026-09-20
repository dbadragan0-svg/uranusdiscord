import type {
  ChatInputCommandInteraction,
  Client,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandBuilder,
} from "discord.js";

export interface BotCommand {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface CommandContext {
  client: Client;
}