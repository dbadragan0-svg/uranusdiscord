# Discord Bot Custom

Fundația unui bot Discord construit cu Node.js, TypeScript și Discord.js.

## Structura proiectului

```text
src/
├── bot/
│   ├── client.ts              # Clientul Discord și intențiile de bază
│   ├── interaction-handler.ts # Execuția comenzilor slash
│   └── register-commands.ts   # Înregistrarea comenzilor în Discord
├── commands/
│   ├── core/
│   │   └── ping.ts            # Comandă de verificare
│   ├── index.ts               # Registrul central de comenzi
│   └── types.ts               # Contractul unei comenzi
├── config/
│   └── env.ts                 # Configurare și validare env
├── modules/
│   ├── exchange-system/       # Pregătit pentru Exchange System
│   ├── giveaway-system/       # Pregătit pentru Giveaway System
│   ├── ticket-system/         # Ticket System
│   └── types.ts               # Contractul unui modul
├── lib/
│   └── logger.ts              # Logger minimal
└── index.ts                   # Punctul de pornire
```

## Pornire locală

1. Copiază `.env.example` în `.env`.
2. Completează `DISCORD_TOKEN` și `DISCORD_CLIENT_ID` din Discord Developer Portal.
3. Pentru dezvoltare, setează și `DISCORD_GUILD_ID` pentru înregistrarea rapidă a comenzilor.
4. Setează `REGISTER_COMMANDS_ON_STARTUP=true`.
5. Rulează:

```bash
pnpm --filter @workspace/discord-bot run dev
```

Fără `DISCORD_TOKEN`, botul se oprește intenționat cu un mesaj clar. Tokenul nu este necesar pentru pregătirea codului și nu trebuie comis în repository.

## Comanda inclusă

- `/ping` — verifică dacă botul răspunde.
- `/ticket setup` — trimite panelul pentru crearea ticketelor.
- `/ticket close` — închide ticketul în canalul curent după validarea canalului.

## Configurarea Ticket System

1. Creează un rol dedicat pentru staff, de exemplu `Support`.
2. Asigură-te că botul are cel puțin:
   - `View Channels`
   - `Send Messages`
   - `Read Message History`
   - `Embed Links`
   - `Manage Channels`
3. Un membru cu `Manage Server` rulează în canalul dorit:

```text
/ticket setup staff_role:@Support category:#Tickets
```

`category` este opțională. Panelul este trimis în canalul în care rulezi comanda, iar ticketele noi devin vizibile doar pentru utilizatorul care le-a creat, rolul staff ales și bot.

Fiecare utilizator poate avea un singur ticket activ. Utilizatorul și staff-ul pot apăsa `🔒 Închide Ticket` pentru ștergerea canalului.

## Extindere

Noile comenzi se adaugă în registrul din `src/commands/index.ts`. Fiecare sistem planificat are deja un modul separat, astfel încât Ticket, Giveaway și Exchange să poată fi dezvoltate independent fără a aglomera punctul principal de pornire.