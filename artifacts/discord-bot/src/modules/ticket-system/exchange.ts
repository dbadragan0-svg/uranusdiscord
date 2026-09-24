import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Client,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../../commands/types.js";
import {
  EXCHANGE_AMOUNT_PREFIX,
  EXCHANGE_METHOD_PREFIX,
  EXCHANGE_SETUP_PREFIX,
  createExchangeMethodId,
  createTicketTopic,
  type ExchangeMethod,
} from "./constants.js";

export const methodNames: Record<ExchangeMethod, string> = {
  "paysafecard-ltc": "PaySafeCard → LTC",
  "creditcard-ltc": "Credit Card → LTC",
  "paypal-ltc": "PayPal → LTC",
};

export const exchangeFees: Record<ExchangeMethod, number> = {
  "paysafecard-ltc": 11,
  "creditcard-ltc": 6,
  "paypal-ltc": 6,
};

const EXCHANGE_IMAGE_URL =
  "https://cdn.discordapp.com/attachments/1437179167220170832/1551542187878260786/08470FC6-915E-491B-910C-499E5A5245FD.png?ex=6ab259c3&is=6ab10843&hm=1ccb2f3d884c3142480a148f332296ddd31de9b6bea779d756d10ebcc9a4f65d&";

export const exchangeCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("exchange")
    .setDescription("Configurează sistemul de Exchange.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Trimite panelul pentru Exchange.")
        .addRoleOption((option) =>
          option
            .setName("staff_role")
            .setDescription("Rolul care va gestiona Exchange-urile.")
            .setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("category")
            .setDescription("Categoria pentru Exchange tickets.")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false),
        ),
    ),

  async execute(interaction) {
    await setupExchangePanel(interaction);
  },
};

export function registerExchangeEvents(client: Client): void {
  client.on("interactionCreate", async (interaction) => {
    try {
      if (interaction.isButton()) {
        if (interaction.customId.startsWith(`${EXCHANGE_SETUP_PREFIX}:`)) {
          await showExchangeMethods(interaction);
          return;
        }

        if (interaction.customId.startsWith(`${EXCHANGE_AMOUNT_PREFIX}:`)) {
          await showAmountModal(interaction);
          return;
        }
      }

      if (interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith(`${EXCHANGE_METHOD_PREFIX}:`)) {
          await createExchangeTicket(interaction);
          return;
        }
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith(`${EXCHANGE_AMOUNT_PREFIX}:`)) {
          await saveExchangeAmount(interaction);
        }
      }
    } catch (error) {
      console.error("Exchange interaction failed:", error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "A apărut o eroare la procesarea Exchange-ului.",
          ephemeral: true,
        });
      }
    }
  });
}

async function setupExchangePanel(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({
      content: "Această comandă poate fi folosită doar într-un server.",
      ephemeral: true,
    });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: "Ai nevoie de permisiunea Manage Server pentru acest setup.",
      ephemeral: true,
    });
    return;
  }

  const staffRole = interaction.options.getRole("staff_role", true);
  const category = interaction.options.getChannel("category");
  const botMember = interaction.guild.members.me;

  if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({
      content:
        "Botul are nevoie de permisiunea Manage Channels pentru Exchange.",
      ephemeral: true,
    });
    return;
  }

  if (staffRole.id === interaction.guild.id) {
    await interaction.reply({
      content: "Alege un rol staff dedicat, nu @everyone.",
      ephemeral: true,
    });
    return;
  }

  const button = new ButtonBuilder()
    .setCustomId(
      `${EXCHANGE_SETUP_PREFIX}:${staffRole.id}:${category?.id ?? "none"}`,
    )
    .setLabel("💱 Start Exchange")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setImage(EXCHANGE_IMAGE_URL)
    .setDescription(`#  💰 Welcome To Uranus Exchangεs 

> - *If You Want To Sell Products, To Help Our Project And To Make Easy Money Join Our Management Team*

# 📜 Terms & Fees Overview

> - *We strongly encourage you to read our [**Terms of Services **] and [**Fees Documentation**]

__Ready to begin your trade?__

> - *⭐️ The exchange can only be started by pressing the button below*`);

  await interaction.reply({
    embeds: [embed],
    components: [row],
  });
}

async function showExchangeMethods(
  interaction: ButtonInteraction,
): Promise<void> {
  const [, , staffRoleId, categoryId] = interaction.customId.split(":");

  if (!staffRoleId || !categoryId) {
    await interaction.reply({
      content: "Panelul Exchange este configurat incorect.",
      ephemeral: true,
    });
    return;
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`${EXCHANGE_METHOD_PREFIX}:${staffRoleId}:${categoryId}`)
    .setPlaceholder("Alege metoda de Exchange")
    .addOptions(
      {
        label: "PaySafeCard → LTC",
        value: createExchangeMethodId("paysafecard-ltc"),
        description: "Fee: 11%",
        emoji: "💳",
      },
      {
        label: "Credit Card → LTC",
        value: createExchangeMethodId("creditcard-ltc"),
        description: "Fee: 6%",
        emoji: "💳",
      },
      {
        label: "PayPal → LTC",
        value: createExchangeMethodId("paypal-ltc"),
        description: "Fee: 6%",
        emoji: "🅿️",
      },
    );

  await interaction.reply({
    content: "### 💱 Alege metoda Exchange:",
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
    ],
    ephemeral: true,
  });
}

async function createExchangeTicket(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({
      content: "Exchange-ul poate fi folosit doar într-un server.",
      ephemeral: true,
    });
    return;
  }

  const [, , staffRoleId, categoryId] = interaction.customId.split(":");
  const selectedValue = interaction.values[0] ?? "";

  const method = selectedValue.replace(
    `${EXCHANGE_METHOD_PREFIX}:`,
    "",
  ) as ExchangeMethod;

  if (!staffRoleId || !categoryId || !methodNames[method]) {
    await interaction.reply({
      content: "Configurația Exchange este invalidă.",
      ephemeral: true,
    });
    return;
  }

  const staffRole = interaction.guild.roles.cache.get(staffRoleId);
  const botMember = interaction.guild.members.me;

  if (!staffRole) {
    await interaction.reply({
      content: "Rolul staff configurat nu mai există.",
      ephemeral: true,
    });
    return;
  }

  if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({
      content:
        "Botul are nevoie de permisiunea Manage Channels pentru a crea ticketul.",
      ephemeral: true,
    });
    return;
  }

  const category =
    categoryId === "none"
      ? undefined
      : interaction.guild.channels.cache.get(categoryId);

  if (
    categoryId !== "none" &&
    (!category || category.type !== ChannelType.GuildCategory)
  ) {
    await interaction.reply({
      content: "Categoria configurată nu mai există.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const fee = exchangeFees[method];

  const topic =
    `${createTicketTopic(interaction.user.id, staffRole.id)}` +
    `;exchange-method:${method}` +
    `;exchange-amount:not-set` +
    `;exchange-usd:not-set` +
    `;exchange-fee:${fee}` +
    `;exchange-fee-usd:not-set` +
    `;exchange-received-usd:not-set` +
    `;exchange-ltc-price:not-set` +
    `;exchange-ltc:not-set`;

  const channelName =
    `exchange-${method}-${interaction.user.username}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 95) || "exchange-ticket";

  const permissionOverwrites = [
    {
      id: interaction.guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    {
      id: staffRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
  ];

  if (interaction.client.user) {
    permissionOverwrites.push({
      id: interaction.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.EmbedLinks,
      ],
    });
  }

  const ticketChannel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: categoryId === "none" ? undefined : categoryId,
    topic,
    permissionOverwrites,
  });

  const amountButton = new ButtonBuilder()
    .setCustomId(`${EXCHANGE_AMOUNT_PREFIX}:${ticketChannel.id}`)
    .setLabel("💰 Introduce suma")
    .setStyle(ButtonStyle.Success);

  const closeButton = new ButtonBuilder()
    .setCustomId("ticket:close")
    .setLabel("🔒 Închide Ticket")
    .setStyle(ButtonStyle.Danger);

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    amountButton,
    closeButton,
  );

  const ticketEmbed = new EmbedBuilder()
    .setColor(0x57f287)
    .setImage(EXCHANGE_IMAGE_URL)
    .setTitle(`${methodNames[method]} • Fee ${fee}%`)
    .setDescription(
      `Salut <@${interaction.user.id}>!\n\n` +
        `💳 **Method:** ${methodNames[method]}\n` +
        `📊 **Exchange Fee:** ${fee}%\n` +
        `💰 **Amount:** Nu a fost introdusă încă.\n` +
        `💵 **USD Value:** Nu a fost calculată încă.\n` +
        `💸 **Received:** Nu a fost calculat încă.\n` +
        `🪙 **LTC To Receive:** Nu a fost calculat încă.\n\n` +
        `Apasă **💰 Introdu suma** pentru a continua.`,
    )
    .setFooter({
      text: `Staff: ${staffRole.name}`,
    });

  await ticketChannel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [ticketEmbed],
    components: [buttons],
  });

  await interaction.editReply({
    content: `Exchange ticket creat: ${ticketChannel}`,
  });
}

async function showAmountModal(
  interaction: ButtonInteraction,
): Promise<void> {
  const channel = interaction.channel;

  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "Acest buton poate fi folosit doar într-un Exchange ticket.",
      ephemeral: true,
    });
    return;
  }

  const metadata = parseExchangeTopic(channel.topic);

  if (!metadata) {
    await interaction.reply({
      content: "Acest canal nu este un Exchange ticket valid.",
      ephemeral: true,
    });
    return;
  }

  if (interaction.user.id !== metadata.ownerId) {
    await interaction.reply({
      content:
        "Doar persoana care a creat Exchange ticketul poate introduce suma.",
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`${EXCHANGE_AMOUNT_PREFIX}:${channel.id}`)
    .setTitle("💰 Introdu suma");

  const amountInput = new TextInputBuilder()
    .setCustomId("exchange_amount")
    .setLabel("Suma în RON")
    .setPlaceholder("Exemplu: 100")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(20);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput),
  );

  await interaction.showModal(modal);
}

async function saveExchangeAmount(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({
      content: "Acest formular poate fi folosit doar într-un server.",
      ephemeral: true,
    });
    return;
  }

  const channelId = interaction.customId.slice(
    `${EXCHANGE_AMOUNT_PREFIX}:`.length,
  );

  const channel = interaction.guild.channels.cache.get(channelId);

  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "Exchange ticketul nu mai există.",
      ephemeral: true,
    });
    return;
  }

  const metadata = parseExchangeTopic(channel.topic);

  if (!metadata || metadata.ownerId !== interaction.user.id) {
    await interaction.reply({
      content: "Doar creatorul Exchange ticketului poate modifica suma.",
      ephemeral: true,
    });
    return;
  }

  const rawAmount = interaction.fields
    .getTextInputValue("exchange_amount")
    .trim()
    .replace(",", ".");

  const amountRon = Number(rawAmount);

  if (!Number.isFinite(amountRon) || amountRon <= 0) {
    await interaction.reply({
      content: "Introdu o sumă validă, de exemplu **100**.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const method = metadata.method;
    const feePercent = exchangeFees[method];

    const [ronUsdRate, ltcPriceUsd] = await Promise.all([
      getRonToUsdRate(),
      getLtcUsdPrice(),
    ]);

    const usdValue = amountRon * ronUsdRate;
    const feeUsd = usdValue * (feePercent / 100);
    const receivedUsd = usdValue - feeUsd;
    const ltcAmount = receivedUsd / ltcPriceUsd;

    const updatedTopic = updateExchangeValues(channel.topic!, {
      amountRon,
      usdValue,
      feePercent,
      feeUsd,
      receivedUsd,
      ltcPriceUsd,
      ltcAmount,
    });

    await channel.setTopic(updatedTopic);

    const messages = await channel.messages.fetch({ limit: 20 });

    const ticketMessage = messages.find(
      (message) =>
        message.author.id === interaction.client.user?.id &&
        message.embeds.some((embed) =>
          embed.title?.includes(methodNames[method]),
        ),
    );

    if (ticketMessage) {
      const updatedEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setImage(EXCHANGE_IMAGE_URL)
        .setTitle(`${methodNames[method]} • Fee ${feePercent}%`)
        .setDescription(
          `Salut <@${metadata.ownerId}>!\n\n` +
            `💳 **Method:** ${methodNames[method]}\n` +
            `📊 **Exchange Fee:** ${feePercent}%\n\n` +
            `💰 **Amount:** ${formatRon(amountRon)} RON\n` +
            `💵 **USD Value:** $${formatUsd(usdValue)}\n` +
            `📊 **Fee:** $${formatUsd(feeUsd)}\n` +
            `💸 **Received:** $${formatUsd(receivedUsd)}\n` +
            `🪙 **LTC To Receive:** ${formatLtc(ltcAmount)} LTC\n` +
            `📈 **LTC Rate:** $${formatUsd(ltcPriceUsd)} / LTC\n\n` +
            `Când ai terminat, folosește **🔒 Închide Ticket**.`,
        )
        .setFooter({
          text: `Fee ${feePercent}% • Exchange`,
        });

      await ticketMessage.edit({
        embeds: [updatedEmbed],
      });
    }

    await interaction.editReply({
      content:
        `✅ Calcul finalizat!\n\n` +
        `💰 ${formatRon(amountRon)} RON\n` +
        `💵 $${formatUsd(usdValue)}\n` +
        `📊 Fee: ${feePercent}% — $${formatUsd(feeUsd)}\n` +
        `💸 Received: $${formatUsd(receivedUsd)}\n` +
        `🪙 LTC: ${formatLtc(ltcAmount)}`,
    });
  } catch (error) {
    console.error("Exchange calculation failed:", error);

    await interaction.editReply({
      content:
        "❌ Nu am putut calcula Exchange-ul momentan. Încearcă din nou în câteva secunde.",
    });
  }
}

function parseExchangeTopic(
  topic: string | null,
):
  | {
      ownerId: string;
      staffRoleId: string;
      method: ExchangeMethod;
    }
  | undefined {
  if (!topic?.startsWith("ticket-owner:")) {
    return undefined;
  }

  const parts = topic.split(";");

  const ownerPart = parts.find((part) =>
    part.startsWith("ticket-owner:"),
  );

  const staffPart = parts.find((part) =>
    part.startsWith("ticket-staff:"),
  );

  const methodPart = parts.find((part) =>
    part.startsWith("exchange-method:"),
  );

  const ownerId = ownerPart?.slice("ticket-owner:".length);
  const staffRoleId = staffPart?.slice("ticket-staff:".length);
  const method = methodPart?.slice(
    "exchange-method:".length,
  ) as ExchangeMethod;

  if (
    !ownerId ||
    !staffRoleId ||
    !method ||
    !methodNames[method]
  ) {
    return undefined;
  }

  return {
    ownerId,
    staffRoleId,
    method,
  };
}

function updateExchangeValues(
  topic: string,
  values: {
    amountRon: number;
    usdValue: number;
    feePercent: number;
    feeUsd: number;
    receivedUsd: number;
    ltcPriceUsd: number;
    ltcAmount: number;
  },
): string {
  const parts = topic.split(";");

  const valuesToSave = {
    "exchange-amount": values.amountRon.toString(),
    "exchange-usd": values.usdValue.toFixed(2),
    "exchange-fee": values.feePercent.toString(),
    "exchange-fee-usd": values.feeUsd.toFixed(2),
    "exchange-received-usd": values.receivedUsd.toFixed(2),
    "exchange-ltc-price": values.ltcPriceUsd.toFixed(2),
    "exchange-ltc": values.ltcAmount.toFixed(8),
  };

  for (const [key, value] of Object.entries(valuesToSave)) {
    const index = parts.findIndex((part) =>
      part.startsWith(`${key}:`),
    );

    const newPart = `${key}:${value}`;

    if (index === -1) {
      parts.push(newPart);
    } else {
      parts[index] = newPart;
    }
  }

  return parts.join(";");
}

async function getRonToUsdRate(): Promise<number> {
  const response = await fetch(
    "https://api.frankfurter.app/latest?from=RON&to=USD",
  );

  if (!response.ok) {
    throw new Error(`RON/USD API failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    rates?: {
      USD?: number;
    };
  };

  const rate = data.rates?.USD;

  if (!rate || !Number.isFinite(rate)) {
    throw new Error("Invalid RON/USD rate.");
  }

  return rate;
}

async function getLtcUsdPrice(): Promise<number> {
  const response = await fetch(
    "https://api.kraken.com/0/public/Ticker?pair=LTCUSD",
  );

  if (!response.ok) {
    throw new Error(`LTC/USD API failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    error?: string[];
    result?: Record<
      string,
      {
        c?: [string, string];
      }
    >;
  };

  if (data.error?.length) {
    throw new Error(data.error.join(", "));
  }

  const ticker = data.result
    ? Object.values(data.result)[0]
    : undefined;

  const price = ticker?.c?.[0]
    ? Number(ticker.c[0])
    : NaN;

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Invalid LTC/USD price.");
  }

  return price;
}

function formatRon(value: number): string {
  return value.toFixed(2);
}

function formatUsd(value: number): string {
  return value.toFixed(2);
}

function formatLtc(value: number): string {
  return value.toFixed(8);
}