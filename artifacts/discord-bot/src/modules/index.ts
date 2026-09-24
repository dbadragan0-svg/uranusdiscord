import { commands } from "../commands/index.js";
import { exchangeSystem } from "./exchange-system/index.js";
import { giveawaySystem } from "./giveaway-system/index.js";
import { ticketSystem } from "./ticket-system/index.js";
import { welcomeModule } from "./welcome/index.js";
import type { BotModule } from "./types.js";

export const botModules: BotModule[] = [
  ticketSystem,
  giveawaySystem,
  exchangeSystem,
  welcomeModule,
];

export function getAllCommands() {
  return [...commands, ...botModules.flatMap((module) => module.commands)];
}

export function findCommand(name: string) {
  return getAllCommands().find((command) => command.data.name === name);
}