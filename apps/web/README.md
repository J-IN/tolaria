# Tolaria Web

The web target of Tolaria: the shared React/BlockNote shell in `src/`, built as a static web app with no Tauri runtime. AGPL-3.0-or-later, like the rest of this repository.

This directory holds build and test configuration only. It does not copy `src/`; it builds it.

| Command (from the repo root) | What it does |
|---|---|
| `pnpm build:web` | Builds the shell into `apps/web/dist` |
| `pnpm preview:web` | Serves `apps/web/dist` on `127.0.0.1:4173` |
| `pnpm playwright:web` | Checks the bundle in Chromium, WebKit, iPhone 15 and iPad emulation (build first) |
| `pnpm test:web-config` | Unit tests for the preview options |

| File | Purpose |
|---|---|
| `vite.config.ts` | Web build and preview config, layered on the root `vite.config.ts` |
| `previewOptions.ts` | Host, port and allowed-host resolution from `TOLARIA_WEB_*` |
| `playwright.config.ts`, `tests/` | Browser checks for the static bundle |

Today the bundle runs on demo data from `src/mock-tauri/`. The remote backend that replaces it plugs in through `VaultBackend` (`src/lib/vaultBackend/`).

- Inventory, `VaultBackend`, collaboration notes and the server surface: [docs/web/s1-tauri-inventory.md](../../docs/web/s1-tauri-inventory.md)
- Testing on an iPad or iPhone: [docs/web/s2-device-test.md](../../docs/web/s2-device-test.md)
- Deliberate UI departures from desktop: [docs/web/ui-departures.md](../../docs/web/ui-departures.md)
- Decision record: [ADR 0185](../../docs/adr/0185-tolaria-web-target-and-vault-backend-seam.md)

The preview server binds to loopback by default. Read the safety rules in the device-test guide before binding it to any other address.
