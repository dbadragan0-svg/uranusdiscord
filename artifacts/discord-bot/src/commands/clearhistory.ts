import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { BotCommand } from "../types.js";

const HISTORY_CHANNEL_NAME = "「🔖」꩜history";

export const clearHistoryCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("clearhistory")
    .setDescription("Șterge istoricul Exchange.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild,
    ),

  async execute(interaction) {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content:
          "Această comandă poate fi folosită doar într-un server.",
        ephemeral: true,
      });
      return;
    }

    if (
      !interaction.memberPermissions?.has(
        PermissionFlagsBits.ManageGuild,
      )
    ) {
      await interaction.reply({
        content:
          "Nu ai permisiunea necesară pentru această comandă.",
        ephemeral: true,
      });
      return;
    }

    const historyChannel =
      interaction.guild.channels.cache.find(
        (channel) =>
          channel.type === ChannelType.GuildText &&
          channel.name === HISTORY_CHANNEL_NAME,
      );

    if (
      !historyChannel ||
      historyChannel.type !== ChannelType.GuildText
    ) {
      await interaction.reply({
        content:
          `❌ Canalul \`${HISTORY_CHANNEL_NAME}\` nu a fost găsit.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({
      ephemeral: true,
    });

    try {
      let deleted = 0;

      while (true) {
        const messages =
          await historyChannel.messages.fetch({
            limit: 100,
          });

        if (messages.size === 0) {
          break;
        }

        const deletable = messages.filter(
          (message) =>
            Date.now() - message.createdTimestamp <
            14 * 24 * 60 * 60 * 1000,
        );

        if (deletable.size === 0) {
          break;
        }

        const deletedMessages =
          await historyChannel.bulkDelete(
            deletable,
            true,
          );

        deleted += deletedMessages.size;

        if (deletedMessages.size === 0) {
          break;
        }
      }

      await interaction.editReply({
        content:
          `🧹 **History șters cu succes!**\n\n` +
          `🗑️ Mesaje șterse: **${deleted}**\n` +
          `📊 Leaderboard-ul va porni de la **0**.`,
      });
    } catch (error) {
      console.error(
        "❌ ClearHistory failed:",
        error,
      );

      await interaction.editReply({
        content:
          "❌ Nu am putut șterge istoricul. Verifică dacă botul are permisiunea **Manage Messages**.",
      });
    }
  },
};