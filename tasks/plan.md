# Plan: reelmarks — implementation

## Strategy: thin vertical slice first, then de-risk in order
The spec's component order (`extension → companion → web`) is the *dependency* order, not the smart *build* order. The two scariest parts are (1) the fragile X/YouTube DOM scrapers and (2) the iOS local-HTTPS + cert + offline chain. So we prove the plumbing with **fake data first**, and only fight the scrapers once the pipe works end-to-end. Bonus: you get the fun part — the actual TikTok feel — working on day one.

## Build order (by risk, not by dependency)

### Slice 0 — Scaffold + the one contract
Monorepo dirs, `shared/schema.ts` (the `Item` type everything speaks), TS + lint config.
- **Checkpoint:** all three packages install and typecheck; `schema.ts` imported by each.
- **Parallelizable:** no (everything depends on it).

### Slice 1 — The player, on fake data (prove the *feel*)
PWA renders a **hand-written sample `bundle.json`** as a full-screen vertical scroll-snap feed: X embed, YouTube embed, and a thumbnail+deeplink fallback card. Desktop browser only for now.
- **Checkpoint:** flick through 3 sample items in Chrome/Dia; one item per viewport; X + YouTube play inline; fallback card opens source. **This is the go/no-go on whether the idea feels good.**
- **Parallelizable with Slice 3's scraper logic** (shared only via `schema.ts`).

### Slice 2 — Companion + LAN + iOS (prove the *pipe*)
Node HTTPS companion serves the PWA + the *same fake* `bundle.json` on the LAN. Generate self-signed cert; trust it once on the iPhone; Add to Home Screen; confirm offline-from-cache.
- **Checkpoint:** open `https://<laptop-ip>:<port>` on the iPhone, trust cert, install to home screen, **one-tap pulls bundle → IndexedDB**, then **airplane-mode + laptop-shut still scrolls** from cache. This retires the hardest infra risk while data is still fake.

### Slice 3 — Real X scraper → POST to companion (first real data)
Extension content script auto-scrolls X bookmarks, extracts items, normalizes, POSTs the bundle to companion `/ingest`. Normalizer + extractor fixture-tested.
- **Checkpoint:** `vitest` green against a saved X fixture; live run on your real X bookmarks produces a bundle; one-tap on phone shows **your real saves**. End-to-end for one platform.

### Slice 4 — YouTube scraper (second platform, same interface)
Add `scrapers/youtube.ts` behind the same `Scraper` interface; merge both platforms into one bundle.
- **Checkpoint:** `vitest` green against a YouTube fixture; combined feed shows X + YouTube interleaved.

### Slice 5 — Polish
Dedupe by `Item.id`, re-sync/merge (new saves append, don't wipe), embed edge-cases, graceful fallback when an embed/signed URL dies.
- **Checkpoint:** re-scrape after saving something new → it appears without duplicating the old; dead media degrades to a card, never a blank screen.

## Risks & mitigations
- **X/YouTube DOM changes break scrapers** → isolate each extractor behind `Scraper`; fixture tests catch breakage fast; scrapers are the *last* thing built, on top of a proven pipe.
- **iOS won't install / won't go offline** → proven in Slice 2 on fake data, before any scraper effort is sunk.
- **Cert-trust friction on iPhone** → one-time, documented step; isolated to Slice 2.
- **I can't run anything (sandbox)** → every runnable step ships as a copy-paste block; you run installs/servers/tests, paste me output when something fails.

## Verification cadence
Each slice ends at a checkpoint you can personally eyeball or run. We don't start the next slice until the current checkpoint passes. Scrapers never ship untested against a fixture.
