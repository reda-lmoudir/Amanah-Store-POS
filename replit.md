# Amanah Store POS

Arabic RTL mobile point-of-sale app for grocery stores, with local product, cart, invoice, and barcode workflows.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
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

## Where things live

- `artifacts/amanah-store-pos/app/(tabs)/index.tsx` — main mobile experience and local store state
- `artifacts/amanah-store-pos/constants/colors.ts` — Amanah green theme tokens
- `artifacts/amanah-store-pos/assets/images/` — app icon and product imagery
- `artifacts/api-server` — shared API scaffold, currently not required by the first local-first mobile build

## Architecture decisions

- The first mobile build is local-first and uses AsyncStorage for products and invoices so the POS remains usable without an account or network.
- The product, cart, invoice, and scanner surfaces live together to keep the first cashier workflow fast and consistent.
- Barcode scanning uses the native Expo camera when running on a device; the web preview provides a guided fallback.

## Product

- Cashiers can browse Arabic grocery products, filter by category, sell by piece/kilogram/gram, and add items to a cart.
- Checkout supports customer names, paid or credit status, invoice history, local product CRUD, and barcode recognition.

## User preferences

- Interface language is Arabic with RTL layout and English numerals.
- Currency defaults to Moroccan dirham (`د.م`).

## Gotchas

- Expo Go provides the native camera flow; web preview cannot access the same native barcode scanner and exposes demo scan actions instead.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
