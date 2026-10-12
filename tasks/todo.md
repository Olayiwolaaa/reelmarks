# Tasks: reelmarks

Ordered by dependency. Each task: single focused session, ≤5 files, explicit acceptance + verification.

## Slice 0 — Scaffold + contract
- [ ] Task: Create monorepo structure + `shared/schema.ts`
  - Acceptance: `extension/`, `companion/`, `web/`, `shared/`, `tasks/` exist; `Item` + `Scraper` types defined; each package has `package.json` + `tsconfig`.
  - Verify: `npm install` in each package succeeds; `tsc --noEmit` passes.
  - Files: `shared/schema.ts`, `extension/package.json`, `web/package.json`, `companion/package.json`, root `tsconfig.base.json`.

## Slice 1 — Player on fake data
- [ ] Task: Sample bundle + IndexedDB layer
  - Acceptance: `web/sample/bundle.json` with 1 X + 1 YouTube + 1 fallback item; `db.ts` reads/writes items to IndexedDB.
  - Verify: load PWA in dev, items land in IndexedDB (DevTools → Application).
  - Files: `web/sample/bundle.json`, `web/src/db.ts`, `web/src/main.ts`.
- [ ] Task: Vertical scroll-snap feed + card renderer
  - Acceptance: full-viewport items, `scroll-snap-type: y mandatory`; `card.ts` dispatches to embed vs thumbnail+deeplink.
  - Verify: flick through all 3 samples in Chrome/Dia; one per screen; inline play works.
  - Files: `web/src/feed.ts`, `web/src/card.ts`, `web/src/embeds/x.ts`, `web/src/embeds/youtube.ts`, `web/index.html`.

## Slice 2 — Companion + LAN + iOS
- [ ] Task: Node HTTPS companion
  - Acceptance: `server.ts` with `POST /ingest`, `GET /bundle.json`, static-serves built PWA; `npm run cert` makes a self-signed cert; binds to LAN.
  - Verify: `curl -k https://localhost:<port>/bundle.json` returns the sample.
  - Files: `companion/server.ts`, `companion/package.json`, `companion/scripts/cert.mjs`.
- [ ] Task: iOS install + offline-from-cache
  - Acceptance: web manifest + service worker cache the shell + last bundle; one-tap sync writes to IndexedDB.
  - Verify: on iPhone — trust cert, Add to Home Screen, launch full-screen, one-tap sync, then airplane-mode + laptop-shut still scrolls.
  - Files: `web/public/manifest.webmanifest`, `web/public/sw.js`, `web/src/sync.ts`.

## Slice 3 — X scraper
- [ ] Task: Scraper interface + X extractor (fixture-tested)
  - Acceptance: `scraper.ts` interface; `scrapers/x.ts` turns saved X DOM → `Item[]`; `normalize.ts` validates against schema.
  - Verify: `vitest` green against `test/fixtures/x.html`.
  - Files: `extension/src/scraper.ts`, `extension/src/scrapers/x.ts`, `extension/src/normalize.ts`, `extension/test/x.test.ts`, `extension/test/fixtures/x.html`.
- [ ] Task: Extension shell + auto-scroll + POST to companion
  - Acceptance: MV3 manifest; content script auto-scrolls X bookmarks to load all; `send.ts` POSTs bundle to companion `/ingest`.
  - Verify: live run on real X bookmarks → companion receives bundle → one-tap on phone shows your real saves.
  - Files: `extension/manifest.json`, `extension/src/background.ts`, `extension/src/send.ts`.

## Slice 4 — YouTube scraper
- [ ] Task: YouTube extractor (fixture-tested) + merge
  - Acceptance: `scrapers/youtube.ts` behind same interface; bundle merges both platforms.
  - Verify: `vitest` green against `test/fixtures/youtube.html`; combined feed interleaves X + YouTube.
  - Files: `extension/src/scrapers/youtube.ts`, `extension/test/youtube.test.ts`, `extension/test/fixtures/youtube.html`.

## Slice 5 — Polish
- [ ] Task: Dedupe + incremental re-sync
  - Acceptance: re-scrape appends new items by `Item.id`, never duplicates or wipes existing.
  - Verify: save new item → re-scrape → it appears once, old items intact.
  - Files: `extension/src/normalize.ts`, `web/src/db.ts`.
- [ ] Task: Dead-media graceful fallback
  - Acceptance: a 403/expired embed renders as a thumbnail+deeplink card, never a blank frame.
  - Verify: point an item at a dead URL → card still opens source.
  - Files: `web/src/card.ts`, `web/src/embeds/x.ts`, `web/src/embeds/youtube.ts`.
