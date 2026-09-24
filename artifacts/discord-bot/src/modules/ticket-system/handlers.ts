import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type ButtonInteraction,
  type Client,
  type ChatInputCommandInteraction,
  type GuildTextBasedChannel,
} from "discord.js";

import {
  EXCHANGE_HISTORY_CHANNEL_NAME,
  TICKET_CLOSE_CUSTOM_ID,
  createTicketTopic,
  parseExchangeMethodId,
  parseTicketButtonId,
  parseTicketTopic,
  isTicketCreateInteraction,
  type ExchangeMethod,
} from "./constants.js";

import { addCompletedExchange } from "./leaderboard.js";

const methodNames: Record<ExchangeMethod, string> = {
  "paysafecard-ltc": "PaySafeCard → LTC",
  "creditcard-ltc": "Credit Card → LTC",
  "paypal-ltc": "PayPal → LTC",
};

const exchangeFees: Record<ExchangeMethod, number> = {
  "paysafecard-ltc": 11,
  "creditcard-ltc": 6,
  "paypal-ltc": 6,
};

export function registerTicketEvents(client: Client): void {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) {
      return;
    }

    if (isTicketCreateInteraction(interaction)) {
      await handleCreateTicket(interaction);
      return;
    }

    if (interaction.customId === TICKET_CLOSE_CUSTOM_ID) {
      await closeTicketInteraction(interaction);
    }
  });
}

async function handleCreateTicket(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({
      content: "Acest buton poate fi folosit doar într-un server.",
      ephemeral: true,
    });
    return;
  }

  const config = parseTicketButtonId(interaction.customId);

  if (!config) {
    await interaction.reply({
      content: "Configurația ticketului este invalidă.",
      ephemeral: true,
    });
    return;
  }

  const guild = interaction.guild;
  const member = await guild.members.fetch(interaction.user.id);
  const botMember = guild.members.me;

  if (
    !botMember?.permissions.has(
      PermissionFlagsBits.ManageChannels,
    )
  ) {
    await interaction.reply({
      content:
        "Botul are nevoie de permisiunea Manage Channels pentru a crea tickete.",
      ephemeral: true,
    });
    return;
  }

  const existingTicket = guild.channels.cache.find((channel) => {
    if (channel.type !== ChannelType.GuildText) {
      return false;
    }

    const metadata = parseTicketTopic(channel.topic);

    return metadata?.ownerId === interaction.user.id;
  });

  if (existingTicket) {
    await interaction.reply({
      content: `Ai deja un ticket deschis: ${existingTicket}`,
      ephemeral: true,
    });
    return;
  }

  const safeUsername = interaction.user.username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 20);

  const channel = await guild.channels.create({
    name: `ticket-${safeUsername || interaction.user.id}`,
    type: ChannelType.GuildText,
    parent: config.categoryId,
    topic: createTicketTopic(
      interaction.user.id,
      config.staffRoleId,
    ),
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
      {
        id: config.staffRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
      {
        id: botMember.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
    ],
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🎫 Ticket deschis")
    .setDescription(
      [
        `Salut ${interaction.user}!`,
        "",
        "Un membru al echipei va reveni în cel mai scurt timp.",
        "",
        "Folosește butonul de mai jos pentru a închide ticketul.",
      ].join("\n"),
    )
    .setFooter({
      text: "UranusMarket™ • Support",
    });

  const closeButton = new ButtonBuilder()
    .setCustomId(TICKET_CLOSE_CUSTOM_ID)
    .setLabel("🔒 Închide Ticket")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(closeButton);

  await channel.send({
    content: `<@${interaction.user.id}> <@&${config.staffRoleId}>`,
    embeds: [embed],
    components: [row],
  });

  await interaction.reply({
    content: `Ticketul tău a fost creat: ${channel}`,
    ephemeral: true,
  });
}

export async function closeTicketInteraction(
  interaction:
    | ButtonInteraction
    | ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({
      content:
        "Această acțiune poate fi folosită doar într-un server.",
      ephemeral: true,
    });
    return;
  }

  const channel = interaction.channel;

  if (
    !channel ||
    channel.type !== ChannelType.GuildText
  ) {
    await interaction.reply({
      content:
        "Această comandă poate fi folosită doar într-un ticket.",
      ephemeral: true,
    });
    return;
  }

  const metadata = parseTicketTopic(channel.topic);

  if (!metadata) {
    await interaction.reply({
      content:
        "Acest canal nu pare să fie un ticket valid.",
      ephemeral: true,
    });
    return;
  }

  const member = await interaction.guild.members.fetch(
    interaction.user.id,
  );

  const isOwner =
    metadata.ownerId === interaction.user.id;

  const isStaff =
    member.roles.cache.has(metadata.staffRoleId) ||
    member.permissions.has(
      PermissionFlagsBits.ManageGuild,
    );

  if (!isOwner && !isStaff) {
    await interaction.reply({
      content:
        "Nu ai permisiunea să închizi acest ticket.",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content:
      "🔒 Ticketul se închide și tranzacția este salvată în History...",
    ephemeral: true,
  });

  const exchangeData = parseExchangeTopic(channel.topic);

  if (exchangeData) {
    try {
      await saveExchangeHistory(
        interaction,
        channel,
        exchangeData,
      );
    } catch (error) {
      console.error(
        "❌ Exchange close error:",
        error,
      );
    }
  }

  try {
    await channel.delete();
  } catch (error) {
    console.error(
      "❌ Nu am putut șterge ticketul:",
      error,
    );
  }
}

interface ExchangeHistoryData {
  ownerId: string;
  staffRoleId: string;
  method: ExchangeMethod;
  amountRon?: number;
  usdValue?: number;
  feePercent: number;
  feeUsd?: number;
  receivedUsd?: number;
  ltcPrice?: number;
  ltcAmount?: number;
}

function parseExchangeTopic(
  topic: string | null,
): ExchangeHistoryData | undefined {
  if (!topic) {
    return undefined;
  }

  const values: Record<string, string> = {};

  for (const part of topic.split(";")) {
    const separator = part.indexOf(":");

    if (separator === -1) {
      continue;
    }

    const key = part.slice(0, separator);
    const value = part.slice(separator + 1);

    values[key] = value;
  }

  const ownerId = values["ticket-owner"];
  const staffRoleId = values["ticket-staff"];
  const methodValue = values["exchange-method"];

  if (!ownerId || !staffRoleId || !methodValue) {
    return undefined;
  }

  const method = parseExchangeMethodId(
    `exchange:method:${methodValue}`,
  );

  if (!method) {
    return undefined;
  }

  const numberFromTopic = (
    key: string,
  ): number | undefined => {
    const value = values[key];

    if (!value || value === "not-set") {
      return undefined;
    }

    const normalized = value.replace(",", ".");
    const number = Number(normalized);

    return Number.isFinite(number)
      ? number
      : undefined;
  };

  return {
    ownerId,
    staffRoleId,
    method,
    amountRon: numberFromTopic("exchange-amount"),
    usdValue: numberFromTopic("exchange-usd"),
    feePercent:
      numberFromTopic("exchange-fee") ??
      exchangeFees[method],
    feeUsd: numberFromTopic("exchange-fee-usd"),
    receivedUsd: numberFromTopic(
      "exchange-received-usd",
    ),
    ltcPrice: numberFromTopic(
      "exchange-ltc-price",
    ),
    ltcAmount: numberFromTopic("exchange-ltc"),
  };
}

async function saveExchangeHistory(
  interaction:
    | ButtonInteraction
    | ChatInputCommandInteraction,
  ticketChannel: GuildTextBasedChannel,
  data: ExchangeHistoryData,
): Promise<void> {
  const historyChannel =
    interaction.guild?.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildText &&
        channel.name ===
          EXCHANGE_HISTORY_CHANNEL_NAME,
    );

  if (
    !historyChannel ||
    historyChannel.type !== ChannelType.GuildText
  ) {
    console.error(
      `History channel "${EXCHANGE_HISTORY_CHANNEL_NAME}" nu a fost găsit.`,
    );
    return;
  }

  const role =
    interaction.guild?.roles.cache.get(
      data.staffRoleId,
    );

  const formatMoney = (
    value?: number,
  ): string => {
    if (value === undefined) {
      return "Nespecificat";
    }

    return `$${value.toFixed(2)}`;
  };

  const formatRon = (
    value?: number,
  ): string => {
    if (value === undefined) {
      return "Nespecificat";
    }

    return `${value.toFixed(2)} RON`;
  };

  const formatLtc = (
    value?: number,
  ): string => {
    if (value === undefined) {
      return "Nespecificat";
    }

    return `${value.toFixed(4)} LTC`;
  };

  const feeText =
    data.feeUsd === undefined
      ? `${data.feePercent}%`
      : `${data.feePercent}%  •  -${formatMoney(
          data.feeUsd,
        )}`;

  const now = new Date();

  const dateText = now.toLocaleString(
    "ro-RO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  const historyText = [
    "╭──────────────────────────────────────╮",
    "│        💱 EXCHANGE COMPLETED         │",
    `│      ${centerText(
      `${methodNames[data.method]} • ${data.feePercent}%`,
      36,
    )}│`,
    "╰──────────────────────────────────────╯",
    "",
    "👤 Client",
    `<@${data.ownerId}>`,
    "",
    "💰 TRANSACTION",
    `> Sent             ${formatRon(data.amountRon)}`,
    `> USD Value         ${formatMoney(data.usdValue)}`,
    `> Exchange Fee      ${feeText}`,
    `> Received          ${formatMoney(data.receivedUsd)}`,
    "",
    "🪙 LTC",
    `> LTC Rate          ${
      data.ltcPrice !== undefined
        ? `$${data.ltcPrice.toFixed(2)} / LTC`
        : "Nespecificat"
    }`,
    `> Received          ${formatLtc(data.ltcAmount)}`,
    "",
    "👮 STAFF",
    `> Closed by         <@${interaction.user.id}>`,
    `> Staff Role        ${
      role ? `<@&${role.id}>` : "Rol indisponibil"
    }`,
    "",
    `📅 ${dateText}`,
    `🎫 ${ticketChannel.name}`,
  ].join("\n");

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setDescription(
      `\`\`\`\n${historyText}\n\`\`\``,
    )
    .setTimestamp(now)
    .setFooter({
      text:
        "Uranus Exchangεs • Exchange History",
    });

  await historyChannel.send({
    embeds: [embed],
  });

  // ================================
  // EXCHANGE LEADERBOARD
  // ================================

  if (
    data.amountRon !== undefined &&
    Number.isFinite(data.amountRon) &&
    data.amountRon > 0
  ) {
    console.log(
      `🏆 LEADERBOARD ADD: ${data.ownerId} → ${data.amountRon} RON`,
    );

    await addCompletedExchange(
      interaction.client,
      data.ownerId,
      data.amountRon,
    );

    console.log(
      `🏆 LEADERBOARD SUCCESS: ${data.ownerId}`,
    );
  } else {
    console.log(
      `⚠️ LEADERBOARD SKIP: suma RON lipsește pentru ${data.ownerId}`,
    );
  }
}

function centerText(
  text: string,
  width: number,
): string {
  if (text.length >= width) {
    return text.slice(0, width);
  }

  const totalPadding = width - text.length;
  const left = Math.floor(totalPadding / 2);
  const right = totalPadding - left;

  return `${" ".repeat(left)}${text}${" ".repeat(right)}`;
}