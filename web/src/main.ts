import "./styles.css";
import { validateBundle } from "@reelmarks/shared";
import sampleData from "../sample/bundle.json";
import { allItems, saveItems } from "./db";
import { renderFeed } from "./feed";
import { fetchBundle } from "./sync";

async function boot(): Promise<void> {
  registerServiceWorker();

  const feed = document.getElementById("feed");
  if (!feed) return;

  let items = await allItems();
  if (items.length === 0) {
    // Prefer the companion's bundle; fall back to the bundled sample (dev / no companion).
    items = (await fetchBundle()) ?? [];
    if (items.length === 0) {
      const bundle = validateBundle(sampleData);
      await saveItems(bundle.items);
      items = bundle.items;
    }
  }

  renderFeed(feed, items);
}

function registerServiceWorker(): void {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      void navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
}

void boot();
