// The one contract every package speaks. Keep this the single source of truth
// for the shape of a saved item — extension produces it, companion carries it,
// web consumes it.

export type Platform = "x" | "youtube"; // v1; union grows as scrapers are added

export type ItemKind = "video" | "image" | "link" | "text";

export interface Item {
  /** stable per-platform id; the dedupe key across re-scrapes */
  id: string;
  platform: Platform;
  kind: ItemKind;
  /** canonical link back to the original post — always present */
  sourceUrl: string;
  /** ISO timestamp; best-effort, platforms don't always expose it */
  savedAt?: string;
  /** handle or channel name */
  author?: string;
  /** display name (e.g. "Omoalhaja") — distinct from the @handle in `author` */
  authorName?: string;
  /** profile image URL; hotlinked from source, falls back to a letter avatar */
  authorAvatarUrl?: string;
  /** show a verified badge on the rendered card */
  verified?: boolean;
  /** caption / title / post text */
  text?: string;
  /** set when a reliable inline embed exists */
  embedUrl?: string;
  /** fallback card image when there's no inline embed */
  thumbnailUrl?: string;
  /** full-bleed background image (rendered blurred/darkened) behind an X card */
  backgroundImageUrl?: string;
  /** image attached to the post (rendered inside an X card, and used as its backdrop) */
  mediaUrl?: string;
  /** native video attached to the post (rendered inline, autoplays like X) */
  videoUrl?: string;
  /** original post time (ISO) — shown on the card */
  postedAt?: string;
  /** view count — shown on the card (e.g. 110900000 renders as "110.9M") */
  views?: number;
  /** engagement counts shown on the action rail */
  likes?: number;
  replies?: number;
}

export interface Bundle {
  version: 1;
  generatedAt: string;
  items: Item[];
}

/** Each platform scraper is a pure DOM -> Item[] transform, testable against a fixture. */
export interface Scraper {
  platform: Platform;
  /** where this user's saved items live on the platform */
  savedPageUrl: string;
  scrape(doc: Document): Item[];
}

const PLATFORMS: readonly Platform[] = ["x", "youtube"];
const KINDS: readonly ItemKind[] = ["video", "image", "link", "text"];

export function isItem(value: unknown): value is Item {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    v.id.length > 0 &&
    typeof v.sourceUrl === "string" &&
    PLATFORMS.includes(v.platform as Platform) &&
    KINDS.includes(v.kind as ItemKind)
  );
}

/** Throws with a precise reason if the parsed JSON isn't a valid Bundle. */
export function validateBundle(value: unknown): Bundle {
  if (typeof value !== "object" || value === null) {
    throw new Error("bundle: not an object");
  }
  const v = value as Record<string, unknown>;
  if (v.version !== 1) throw new Error("bundle: unsupported version");
  if (typeof v.generatedAt !== "string") throw new Error("bundle: missing generatedAt");
  if (!Array.isArray(v.items)) throw new Error("bundle: items is not an array");
  const badIndex = v.items.findIndex((it) => !isItem(it));
  if (badIndex !== -1) throw new Error(`bundle: invalid item at index ${badIndex}`);
  return {
    version: 1,
    generatedAt: v.generatedAt as string,
    items: v.items as Item[],
  };
}
