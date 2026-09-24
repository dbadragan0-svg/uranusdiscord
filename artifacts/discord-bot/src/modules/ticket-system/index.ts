import type { BotModule } from "../types.js";
import { ticketCommand } from "./command.js";
import { registerTicketEvents } from "./handlers.js";
import {
  exchangeCommand,
  registerExchangeEvents,
} from "./exchange.js";
import { registerLeaderboardEvents } from "./leaderboard.js";

export const ticketSystem: BotModule = {
  name: "Ticket System",
  commands: [ticketCommand, exchangeCommand],

  registerEvents(client) {
    registerTicketEvents(client);
    registerExchangeEvents(client);
    registerLeaderboardEvents(client);
  },
};