# Spec: Bookmark Feed — personal TikTok-style resurfacing feed

## Decisions (locked)
1. Desktop browser is **Dia** (Chromium) — a standard Manifest V3 extension, loaded unpacked. Identical in Chrome if needed.
2. Phone is **iOS/Safari** (the stricter PWA target).
3. **Sync = LAN one-tap over local HTTPS.** A tiny local companion server (self-signed cert, trusted once on iOS) serves the PWA + latest bundle on your Wi-Fi. One tap pulls the latest; the PWA caches to IndexedDB so you can scroll **offline, laptop shut**. This is the only option that honors both "one-tap" *and* "lean back in bed." Cost: a one-time cert-trust step + a ~40-line local server.
4. "As light as possible" means **no cloud, no accounts, no media storage, minimal dependencies.** The one concession is a small *local-only* companion server, required by the LAN one-tap choice.
5. v1 beachhead = **X (Twitter) + YouTube** — both embed-friendly, so inline playback feels like TikTok. Instagram and others are deferred.

## Objective
A personal, single-user vertical feed that resurfaces items you've saved across your socials, so they stop dying in each platform's bookmark graveyard. You flick through them TikTok-style on your phone, lean-back.

- **User:** Just you. No sign-up, no third-party data.
- **Success feeling:** You open it in bed and actually enjoy flicking through your own saved bangers.
- **Core job:** Resurfacing (serendipitous rediscovery), not search/retrieval.

## Components (one pipeline, four parts)
| Part | Responsibility | Depends on |
|---|---|---|
| `extension` | Scrape X + YouTube saved pages in your logged-in session; normalize to a common item schema; POST the bundle to the local companion | — |
| `companion` | Tiny local-only server (local HTTPS). Receives the bundle from the extension; serves the PWA + latest `bundle.json` on the LAN | `extension` |
| `web` (PWA) | One-tap pull the latest bundle, cache to IndexedDB, play it as a full-screen vertical snap feed; works offline from cache | `companion` |
| `sync` | The glue: extension→companion POST, phone→companion LAN fetch, one-time cert trust on iOS | all of the above |

Build order: `extension` → `companion` → `web` → wire the sync ends.

## Tech Stack
- **Extension:** Chromium Manifest V3. Background service worker + content scripts. TypeScript. `host_permissions` for `x.com`, `youtube.com`, and `https://localhost:<port>` (to POST the bundle to the companion).
- **Scraping:** content script auto-scrolls the saved/bookmarks page to load items, reads the DOM, normalizes. One extractor module per platform behind a shared `Scraper` interface.
- **Companion:** a ~40-line Node HTTP**S** server (self-signed cert). Endpoints: `POST /ingest` (extension pushes bundle), `GET /bundle.json` (phone pulls latest), and static-serves the built PWA. Binds to the LAN so the phone can reach `https://<laptop-ip>:<port>`. Local-only; never faces the internet.
- **PWA:** Vite + TypeScript, **vanilla DOM** (CSS scroll-snap does the heavy lifting — no framework needed for v1). `idb` for IndexedDB. Service worker + web manifest for installability/offline (works because the companion serves over HTTPS → secure context).
- **Transfer format:** a single `bundle.json` (array of normalized items). No binaries.
- **Media:** never stored. Embed/hotlink from source where stable (YouTube, X); thumbnail + deep-link card where source fights back (signed/expiring URLs).

## Commands
```
# Extension
cd extension && npm install
npm run build          # produces dist/ to load unpacked
npm run lint

# PWA
cd web && npm install
npm run dev            # local dev server
npm run build          # static build to dist/ (served by companion)
npm run lint
npm test               # vitest (normalizer/schema unit tests)

# Companion (local-only server)
cd companion && npm install
npm run cert           # generate self-signed cert once
npm run serve          # serve PWA + bundle on https://<laptop-ip>:<port>
```

## Project Structure
```
bookmark-feed/
  shared/
    schema.ts          # the normalized Item type (single source of truth)
  extension/
    manifest.json
    src/
      background.ts     # orchestration + POST bundle to companion
      scrapers/         # x.ts, youtube.ts
      scraper.ts        # Scraper interface
      normalize.ts
      send.ts           # POST bundle.json to companion /ingest
    test/fixtures/      # saved sample HTML per platform
  companion/
    server.ts           # HTTPS: POST /ingest, GET /bundle.json, static PWA
    cert/               # self-signed cert (gitignored)
  web/
    index.html
    public/
      manifest.webmanifest
      sw.js
      icons/
    src/
      main.ts
      feed.ts           # scroll-snap vertical feed
      card.ts           # per-item renderer (embed vs thumbnail+deeplink)
      embeds/           # per-platform embed helpers (x, youtube)
      sync.ts           # one-tap fetch /bundle.json -> IndexedDB
      db.ts             # idb wrapper
  docs/
```

## Code Style
TypeScript, explicit types at boundaries, one extractor per platform. The normalized item is the contract everything speaks:

```ts
// shared/schema.ts
export type Platform = "x" | "youtube"; // v1; union grows as scrapers are added

export interface Item {
  id: string;            // stable per-platform id (dedupe key)
  platform: Platform;
  savedAt?: string;      // ISO; best-effort, may be absent
  author?: string;       // handle or channel
  text?: string;         // caption / title / post text
  sourceUrl: string;     // canonical link back to the original
  embedUrl?: string;     // when inline embed is reliable
  thumbnailUrl?: string; // fallback card image
  kind: "video" | "image" | "link" | "text";
}

export interface Scraper {
  platform: Platform;
  savedPageUrl: string;              // where this user's saves live
  scrape(doc: Document): Item[];     // pure DOM -> items, testable against fixtures
}
```

## Testing Strategy
- **Vitest** unit tests for `normalize.ts` and each scraper's `scrape(doc)` against **saved HTML fixtures** in `extension/test/fixtures/` — the only way to test scrapers deterministically without a live login.
- PWA feed behavior (scroll-snap, embed vs card) verified **manually** on-device for v1.
- Coverage target is pragmatic: the normalizer and schema must be covered; scrapers covered via at least one real fixture each.

## Boundaries
- **Always:** scrape only your own saved pages in your own session; keep all data on your devices; companion binds to the LAN only (never the public internet); test a scraper against a fixture before trusting it; dedupe by `Item.id`.
- **Ask first:** adding a new platform scraper; adding any dependency; changing the `Item` schema; exposing the companion beyond the LAN.
- **Never:** store or transmit credentials; send data to any third-party/cloud server; store full media files (v1); bypass a login or paywall; commit scraped personal data or the cert to the repo.

## Success Criteria (testable)
1. Extension scrapes **X and YouTube** saved pages and POSTs a valid `bundle.json` (schema-validated) to the companion.
2. Companion serves the PWA + latest bundle over local HTTPS; iPhone trusts the cert once.
3. **One tap** on the phone pulls the latest bundle into IndexedDB; the feed then works **offline with the laptop shut** and on cellular (from cache).
4. PWA **installs to the home screen** and launches full-screen (no browser chrome).
5. Feed is **vertical, one item per viewport, scroll-snap flick**; X + YouTube items play inline, anything that won't embed shows thumbnail + tap-to-open.
6. **End-to-end:** save something new on X or YouTube → re-scrape → one-tap sync → it appears in the phone feed.

## Open Questions (need your input before Plan)
1. **Confirm sync approach (b)** — LAN one-tap over local HTTPS with a one-time cert trust on your iPhone. This is the pencilled-in choice; confirm, or fall back to (a) plain-HTTP/laptop-on or (c) share-a-file.
2. **Companion runtime:** a tiny **Node** script is the default. Are you set up to run Node locally, or should the companion be something else?
