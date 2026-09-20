import type { Client } from "discord.js";
import type { BotCommand } from "../commands/types.js";

export interface BotModule {
  name: string;
  commands: BotCommand[];
  registerEvents: (client: Client) => void;
}