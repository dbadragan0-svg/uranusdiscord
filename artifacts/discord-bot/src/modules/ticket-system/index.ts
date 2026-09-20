import type { BotModule } from "../types.js";
import { ticketCommand } from "./command.js";
import { registerTicketEvents } from "./handlers.js";

export const ticketSystem: BotModule = {
  name: "Ticket System",
  commands: [ticketCommand],
  registerEvents: registerTicketEvents,
};