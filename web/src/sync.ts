import { validateBundle, type Item } from "@reelmarks/shared";
import { saveItems } from "./db";

// Pull the latest bundle from the companion (same origin when served by it;
// a 404 under the Vite dev server simply means "no companion", handled by the
// caller falling back to the bundled sample).
export async function fetchBundle(): Promise<Item[] | null> {
  try {
    const res = await fetch("bundle.json", { cache: "no-store" });
    if (!res.ok) return null;
    const bundle = validateBundle(await res.json());
    await saveItems(bundle.items);
    return bundle.items;
  } catch {
    return null;
  }
}
