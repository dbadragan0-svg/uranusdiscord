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
    ),
  async execute(interaction) {
    await setupTicketPanel(interaction);
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
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🎫 Suport")
    .setDescription(
      "Ai nevoie de ajutor? Apasă butonul de mai jos pentru a deschide un ticket privat cu echipa de suport.",
    )
    .setFooter({ text: "Un singur ticket activ per utilizator." });

  await interaction.reply({
    embeds: [embed],
    components: [row],
  });
}