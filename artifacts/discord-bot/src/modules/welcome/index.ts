import {
  ChannelType,
  Events,
  type BotModule,
} from "discord.js";

export const welcomeModule: BotModule = {
  name: "Welcome System",
  commands: [],

  registerEvents(client) {
    client.on(Events.GuildMemberAdd, async (member) => {
      const welcomeChannel = member.guild.channels.cache.find(
        (channel) =>
          channel.type === ChannelType.GuildText &&
          channel.name === "「👋」꩜welcome",
      );

      if (
        !welcomeChannel ||
        welcomeChannel.type !== ChannelType.GuildText
      ) {
        console.log(
          'Canalul "「👋」꩜welcome" nu a fost găsit.',
        );
        return;
      }

      const message = `╭──────────────────────────────────────╮
│          👋 WELCOME TO               │
│          URANUS MARKET™              │
╰──────────────────────────────────────╯

Welcome <@${member.id}>! 💙

> *We're glad to have you here.*
> *Make sure to read our rules and*
> *check out everything Uranus Market*
> *has to offer.*

👤 Member
> <@${member.id}>

📅 Joined
> <t:${Math.floor(member.joinedTimestamp! / 1000)}:F>

🎫 Need help?
> *Open a ticket and our staff will assist you.*`;

      try {
        await welcomeChannel.send({
          content: message,
        });

        console.log(
          `Welcome message sent for ${member.user.tag}`,
        );
      } catch (error) {
        console.error(
          "Nu am putut trimite mesajul de welcome:",
          error,
        );
      }
    });
  },
};