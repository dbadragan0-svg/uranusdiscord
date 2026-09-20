# Discord Bot Custom

Structura de bază pentru un bot Discord Node.js/TypeScript construit cu Discord.js și pregătit pentru module independente.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/discord-bot run dev` — run the Discord bot in watch mode
- `pnpm --filter @workspace/discord-bot run typecheck` — verify the bot's TypeScript types
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Discord bot: Discord.js 14, TypeScript, dotenv, tsx

## Where things live

- `artifacts/discord-bot/src/index.ts` — bot startup and lifecycle
- `artifacts/discord-bot/src/commands/` — slash commands and command registry
- `artifacts/discord-bot/src/modules/` — future Ticket, Giveaway, and Exchange modules
- `artifacts/discord-bot/src/config/env.ts` — environment configuration and validation
- `artifacts/discord-bot/README.md` — bot setup and extension guide

## Architecture decisions

- The bot is isolated in its own workspace package so future Discord features do not mix with the existing API server.
- Slash commands use a central registry and modules expose their own commands/events, keeping future systems independent.
- The bot uses only the `Guilds` intent initially; additional privileged intents should be added only when a feature needs them.
- Command registration is opt-in through `REGISTER_COMMANDS_ON_STARTUP` and can target a development guild for faster iteration.

## Product

Custom Discord bot foundation for a future Ticket System, Giveaway System, and Exchange System.

## User preferences

- User requested the initial foundation only; do not add Ticket, Giveaway, or Exchange behavior until requested.

## Gotchas

- The bot intentionally fails with a clear message until `DISCORD_TOKEN` is configured.
- Never commit `.env`; use `artifacts/discord-bot/.env.example` as the template.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
