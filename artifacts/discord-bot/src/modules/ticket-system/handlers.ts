import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  type ButtonInteraction,
  type Client,
} from "discord.js";
import { logger } from "../../lib/logger.js";
import {
  isTicketCreateInteraction,
  parseTicketButtonId,
  parseTicketTopic,
  TICKET_CLOSE_CUSTOM_ID,
  TICKET_NAME_PREFIX,
  TICKET_TOPIC_PREFIX,
  createTicketTopic,
} from "./constants.js";

export function registerTicketEvents(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) {
      return;
    }

    try {
      if (isTicketCreateInteraction(interaction)) {
        await handleCreateTicket(interaction, client);
      } else if (interaction.customId === TICKET_CLOSE_CUSTOM_ID) {
        await handleCloseTicket(interaction);
      }
    } catch (error) {
      logger.error("Ticket interaction failed.", {
        customId: interaction.customId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "A apărut o eroare la procesarea ticketului.",
          ephemeral: true,
        });
      }
    }
  });
}

async function handleCreateTicket(
  interaction: ButtonInteraction,
  client: Client,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({
      content: "Ticketele pot fi create doar într-un server.",
      ephemeral: true,
    });
    return;
  }

  const config = parseTicketButtonId(interaction.customId);

  if (!config) {
    await interaction.reply({
      content: "Panelul de ticket este configurat incorect.",
      ephemeral: true,
    });
    return;
  }

  const botMember = interaction.guild.members.me;

  if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({
      content:
        "Botul are nevoie de permisiunea Manage Channels pentru a crea ticketul.",
      ephemeral: true,
    });
    return;
  }

  const staffRole = interaction.guild.roles.cache.get(config.staffRoleId);

  if (!staffRole) {
    await interaction.reply({
      content: "Rolul staff configurat nu mai există.",
      ephemeral: true,
    });
    return;
  }

  const topic = createTicketTopic(interaction.user.id, config.staffRoleId);
  const existingTicket = interaction.guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildText &&
      channel.topic?.startsWith(`${TICKET_TOPIC_PREFIX}${interaction.user.id};`),
  );

  if (existingTicket) {
    await interaction.reply({
      content: `Ai deja un ticket deschis: ${existingTicket}`,
      ephemeral: true,
    });
    return;
  }

  if (config.categoryId) {
    const category = interaction.guild.channels.cache.get(config.categoryId);

    if (!category || category.type !== ChannelType.GuildCategory) {
      await interaction.reply({
        content: "Categoria configurată nu mai există.",
        ephemeral: true,
      });
      return;
    }
  }

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

  if (client.user) {
    permissionOverwrites.push({
      id: client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
      ],
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const channelName = createTicketChannelName(interaction.user.username);
  const ticketChannel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: config.categoryId,
    topic,
    permissionOverwrites,
  });

  const closeButton = new ButtonBuilder()
    .setCustomId(TICKET_CLOSE_CUSTOM_ID)
    .setLabel("🔒 Închide Ticket")
    .setStyle(ButtonStyle.Danger);
  const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    closeButton,
  );
  const ticketEmbed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("Ticket deschis")
    .setDescription(
      `Salut <@${interaction.user.id}>! Descrie problema, iar un membru staff te va ajuta în curând.\n\nCând ai terminat, folosește butonul de mai jos pentru a închide ticketul.`,
    )
    .setFooter({ text: `Staff: ${staffRole.name}` });

  await ticketChannel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [ticketEmbed],
    components: [closeRow],
  });

  await interaction.editReply({
    content: `Ticketul tău a fost creat: ${ticketChannel}`,
  });
}

async function handleCloseTicket(
  interaction: ButtonInteraction,
): Promise<void> {
  if (
    !interaction.inGuild() ||
    !interaction.guild ||
    interaction.channel?.type !== ChannelType.GuildText
  ) {
    await interaction.reply({
      content: "Acest buton poate fi folosit doar într-un ticket.",
      ephemeral: true,
    });
    return;
  }

  const metadata = parseTicketTopic(interaction.channel.topic);

  if (!metadata) {
    await interaction.reply({
      content: "Acest canal nu pare să fie un ticket valid.",
      ephemeral: true,
    });
    return;
  }

  const isOwner = interaction.user.id === metadata.ownerId;
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const isStaff =
    member.roles.cache.has(metadata.staffRoleId) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild);

  if (!isOwner && !isStaff) {
    await interaction.reply({
      content: "Doar utilizatorul care a creat ticketul sau staff-ul îl poate închide.",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: "Ticketul se închide...",
    ephemeral: true,
  });

  try {
    await interaction.channel.delete(`Ticket closed by ${interaction.user.tag}`);
  } catch (error) {
    logger.error("Could not delete ticket channel.", {
      channelId: interaction.channel.id,
      error: error instanceof Error ? error.message : String(error),
    });
    await interaction
      .followUp({
        content:
          "Nu am putut închide canalul. Verifică permisiunea Manage Channels pentru bot.",
        ephemeral: true,
      })
      .catch(() => undefined);
  }
}

function createTicketChannelName(username: string): string {
  const safeUsername =
    username
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 75) || "user";

  return `${TICKET_NAME_PREFIX}${safeUsername}`;
}