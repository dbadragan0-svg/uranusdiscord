import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../../commands/types.js";
import { createTicketButtonId } from "./constants.js";
import { closeTicketInteraction } from "./handlers.js";

const SUPPORT_HEADER_GIF =
  "https://share.creavite.co/6ab0186053f3c2975ec2246f.gif";
const SUPPORT_FOOTER_GIF =
  "https://share.creavite.co/6ab018d753f3c2975ec22470.gif";

export const ticketCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Configurează sistemul de tickete.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Trimite panelul pentru deschiderea ticketelor.")
        .addRoleOption((option) =>
          option
            .setName("staff_role")
            .setDescription("Rolul care poate vedea și închide ticketele.")
            .setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("category")
            .setDescription("Categoria în care vor fi create ticketele.")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("close")
        .setDescription("Închide ticketul în care te afli."),
    ),
  async execute(interaction) {
    if (interaction.options.getSubcommand() === "setup") {
      await setupTicketPanel(interaction);
      return;
    }

    if (interaction.options.getSubcommand() === "close") {
      await closeTicketInteraction(interaction);
    }
  },
};

async function setupTicketPanel(
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
        "Botul are nevoie de permisiunea Manage Channels pentru a crea și închide tickete.",
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
      createTicketButtonId({
        staffRoleId: staffRole.id,
        categoryId: category?.id,
      }),
    )
    .setLabel("🎫 Creează Ticket")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
  const headerEmbed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setDescription("#  —  __UranusMarket™__ Support Ticket***")
    .setImage(SUPPORT_HEADER_GIF);
  const contentEmbed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setDescription(`## 📜・__Support Tickets__:
🏷️ Ai o problemă, o întrebare sau ai nevoie de ajutor? Deschide un ticket pentru a lua legătura direct cu echipa noastră.*
## 🎁・__Claim Rewards__:
Revendică recompensele disponibile sau solicită ajutor dacă întâmpini probleme cu primirea acestora.*
## ⚠️ • __Report a User__:
Raportează un utilizator pentru scam, comportament necorespunzător sau încălcarea regulilor serverului. Te rugăm să ai dovezi relevante.*
-# 〃UranusMarket ©, All Rights Reserved`)
    .setImage(SUPPORT_FOOTER_GIF);

  await interaction.reply({
    embeds: [headerEmbed, contentEmbed],
    components: [row],
  });
}