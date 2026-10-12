import type { Item } from "@reelmarks/shared";

// Seed only — proves the extension package resolves the shared contract.
// Replaced by the real scraper orchestration in Slice 3.
export function countItems(items: Item[]): number {
  return items.length;
}
