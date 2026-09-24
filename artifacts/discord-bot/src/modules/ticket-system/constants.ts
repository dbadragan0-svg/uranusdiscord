import type { ButtonInteraction } from "discord.js";

export const TICKET_CREATE_PREFIX = "ticket:create";
export const TICKET_CLOSE_CUSTOM_ID = "ticket:close";
export const TICKET_TOPIC_PREFIX = "ticket-owner:";
export const TICKET_NAME_PREFIX = "ticket-";

export const EXCHANGE_START_CUSTOM_ID = "exchange:start";
export const EXCHANGE_SETUP_PREFIX = "exchange:setup";
export const EXCHANGE_METHOD_PREFIX = "exchange:method";
export const EXCHANGE_AMOUNT_PREFIX = "exchange:amount";

export const EXCHANGE_HISTORY_CHANNEL_NAME = "「🔖」꩜history";
export const EXCHANGE_LEADERBOARD_CHANNEL_NAME = "「🔖」꩜exch-leaderboard";

export type ExchangeMethod =
  | "paysafecard-ltc"
  | "creditcard-ltc"
  | "paypal-ltc";

export interface TicketButtonConfig {
  staffRoleId: string;
  categoryId?: string;
}

export interface TicketMetadata {
  ownerId: string;
  staffRoleId: string;
}

export function createTicketButtonId(config: TicketButtonConfig): string {
  return [
    TICKET_CREATE_PREFIX,
    config.staffRoleId,
    config.categoryId ?? "none",
  ].join(":");
}

export function parseTicketButtonId(
  customId: string,
): TicketButtonConfig | undefined {
  const [scope, action, staffRoleId, categoryId] = customId.split(":");

  if (
    scope !== "ticket" ||
    action !== "create" ||
    !staffRoleId ||
    !categoryId
  ) {
    return undefined;
  }

  return {
    staffRoleId,
    categoryId: categoryId === "none" ? undefined : categoryId,
  };
}

export function createTicketTopic(
  ownerId: string,
  staffRoleId: string,
): string {
  return `${TICKET_TOPIC_PREFIX}${ownerId};ticket-staff:${staffRoleId}`;
}

export function parseTicketTopic(
  topic: string | null,
): TicketMetadata | undefined {
  if (!topic?.startsWith(TICKET_TOPIC_PREFIX)) {
    return undefined;
  }

  const [ownerPart, staffPart] = topic.split(";");
  const ownerId = ownerPart?.slice(TICKET_TOPIC_PREFIX.length);
  const staffRoleId = staffPart?.replace("ticket-staff:", "");

  if (!ownerId || !staffRoleId) {
    return undefined;
  }

  return { ownerId, staffRoleId };
}

export function isTicketCreateInteraction(
  interaction: ButtonInteraction,
): boolean {
  return interaction.customId.startsWith(`${TICKET_CREATE_PREFIX}:`);
}

export function createExchangeMethodId(method: ExchangeMethod): string {
  return `${EXCHANGE_METHOD_PREFIX}:${method}`;
}

export function parseExchangeMethodId(
  customId: string,
): ExchangeMethod | undefined {
  if (!customId.startsWith(`${EXCHANGE_METHOD_PREFIX}:`)) {
    return undefined;
  }

  const method = customId.slice(`${EXCHANGE_METHOD_PREFIX}:`.length);

  if (
    method !== "paysafecard-ltc" &&
    method !== "creditcard-ltc" &&
    method !== "paypal-ltc"
  ) {
    return undefined;
  }

  return method;
}

export function createExchangeAmountId(channelId: string): string {
  return `${EXCHANGE_AMOUNT_PREFIX}:${channelId}`;
}