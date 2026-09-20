import { pingCommand } from "./core/ping.js";
import type { BotCommand } from "./types.js";

export const commands: BotCommand[] = [pingCommand];

export function findCommand(name: string): BotCommand | undefined {
  return commands.find((command) => command.data.name === name);
}