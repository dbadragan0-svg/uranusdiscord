import {
  ChannelType,
  type Client,
  type TextChannel,
} from "discord.js";

import {
  EXCHANGE_HISTORY_CHANNEL_NAME,
  EXCHANGE_LEADERBOARD_CHANNEL_NAME,
} from "./constants.js";

interface TraderStats {
  amountRon: number;
  trades: number;
}

let leaderboardMessageId: string | undefined;

function getTextChannel(
  client: Client,
  channelName: string,
): TextChannel | undefined {
  const guild = client.guilds.cache.first();

  if (!guild) {
    console.log("❌ Leaderboard: nu există niciun server.");
    return undefined;
  }

  const channel = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildText &&
      channel.name === channelName,
  );

  if (!channel || channel.type !== ChannelType.GuildText) {
    console.log(
      `❌ Leaderboard: canalul "${channelName}" nu a fost găsit.`,
    );
    return undefined;
  }

  return channel;
}

async function readCompletedTrades(
  client: Client,
): Promise<Map<string, TraderStats>> {
  const traders = new Map<string, TraderStats>();

  const historyChannel = getTextChannel(
    client,
    EXCHANGE_HISTORY_CHANNEL_NAME,
  );

  if (!historyChannel) {
    return traders;
  }

  try {
    let before: string | undefined;

    while (true) {
      const messages = await historyChannel.messages.fetch({
        limit: 100,
        ...(before ? { before } : {}),
      });

      if (messages.size === 0) {
        break;
      }

      for (const message of messages.values()) {
        if (message.author.id !== client.user?.id) {
          continue;
        }

        for (const embed of message.embeds) {
          const description = embed.description;

          if (!description) {
            continue;
          }

          const userMatch = description.match(
            /👤 Client\s+<@!?(\d+)>/i,
          );

          const amountMatch = description.match(
            /> Sent\s+([\d.,]+)\s+RON/i,
          );

          if (!userMatch || !amountMatch) {
            continue;
          }

          const userId = userMatch[1];
          const rawAmount = amountMatch[1].trim();

          let amount: number;

          if (
            rawAmount.includes(",") &&
            rawAmount.includes(".")
          ) {
            const lastComma = rawAmount.lastIndexOf(",");
            const lastDot = rawAmount.lastIndexOf(".");

            if (lastComma > lastDot) {
              amount = Number(
                rawAmount
                  .replace(/\./g, "")
                  .replace(",", "."),
              );
            } else {
              amount = Number(
                rawAmount.replace(/,/g, ""),
              );
            }
          } else if (rawAmount.includes(",")) {
            amount = Number(
              rawAmount.replace(",", "."),
            );
          } else {
            amount = Number(rawAmount);
          }

          if (
            !Number.isFinite(amount) ||
            amount <= 0
          ) {
            continue;
          }

          const current = traders.get(userId);

          if (current) {
            current.amountRon += amount;
            current.trades += 1;
          } else {
            traders.set(userId, {
              amountRon: amount,
              trades: 1,
            });
          }
        }
      }

      if (messages.size < 100) {
        break;
      }

      const oldest = messages.last();

      if (!oldest) {
        break;
      }

      before = oldest.id;
    }
  } catch (error) {
    console.error(
      "❌ Leaderboard: nu am putut citi History.",
      error,
    );
  }

  return traders;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function createLeaderboardContent(
  traders: Map<string, TraderStats>,
): string {
  const sorted = [...traders.entries()]
    .sort((a, b) => {
      if (b[1].amountRon !== a[1].amountRon) {
        return b[1].amountRon - a[1].amountRon;
      }

      return b[1].trades - a[1].trades;
    })
    .slice(0, 10);

  const lines: string[] = [
    "🏆 **Uranus Exchange — Top 10 Traders**",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];

  if (sorted.length === 0) {
    lines.push("📭 Niciun exchange finalizat încă.");
  } else {
    sorted.forEach(([userId, stats], index) => {
      let position: string;

      if (index === 0) {
        position = "🥇";
      } else if (index === 1) {
        position = "🥈";
      } else if (index === 2) {
        position = "🥉";
      } else {
        position = `#${index + 1}`;
      }

      const tradeText =
        stats.trades === 1 ? "Trade" : "Trades";

      lines.push(
        `${position} <@${userId}> — ${formatNumber(
          stats.amountRon,
        )} RON — ${stats.trades} ${tradeText}`,
      );
    });
  }

  lines.push(
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `Uranus Exchange — Updated ${new Date().toLocaleTimeString(
      "ro-RO",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    )}`,
    "— Refreshes every 5 min",
  );

  return lines.join("\n");
}

export async function refreshLeaderboard(
  client: Client,
): Promise<void> {
  const leaderboardChannel = getTextChannel(
    client,
    EXCHANGE_LEADERBOARD_CHANNEL_NAME,
  );

  if (!leaderboardChannel) {
    return;
  }

  const traders = await readCompletedTrades(client);

  const totalTrades = [...traders.values()].reduce(
    (sum, trader) => sum + trader.trades,
    0,
  );

  console.log(
    `🏆 Exchange Leaderboard actualizat. ${totalTrades} trade-uri.`,
  );

  const content = createLeaderboardContent(traders);

  try {
    let message;

    if (leaderboardMessageId) {
      try {
        message = await leaderboardChannel.messages.fetch(
          leaderboardMessageId,
        );
      } catch {
        leaderboardMessageId = undefined;
      }
    }

    if (!message) {
      const messages =
        await leaderboardChannel.messages.fetch({
          limit: 50,
        });

      message = messages.find(
        (msg) =>
          msg.author.id === client.user?.id &&
          msg.content.includes(
            "Uranus Exchange — Top 10 Traders",
          ),
      );
    }

    if (message) {
      leaderboardMessageId = message.id;

      await message.edit({
        content,
      });

      console.log(
        "🏆 Leaderboard: mesaj existent actualizat.",
      );
    } else {
      const newMessage =
        await leaderboardChannel.send({
          content,
        });

      leaderboardMessageId = newMessage.id;

      console.log(
        "🏆 Leaderboard: mesaj nou creat.",
      );
    }
  } catch (error) {
    console.error(
      "❌ Leaderboard: nu am putut actualiza mesajul.",
      error,
    );
  }
}

export function registerLeaderboardEvents(
  client: Client,
): void {
  client.once("ready", async () => {
    console.log(
      `🏆 Leaderboard system pornit. Canal: ${EXCHANGE_LEADERBOARD_CHANNEL_NAME}`,
    );

    await refreshLeaderboard(client);

    setInterval(
      async () => {
        await refreshLeaderboard(client);
      },
      5 * 60 * 1000,
    );
  });
}

export async function addCompletedExchange(
  client: Client,
  _userId: string,
  _amountRon: number,
): Promise<void> {
  await refreshLeaderboard(client);
}