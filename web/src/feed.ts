import type { Item, Platform } from "@reelmarks/shared";
import { type Card, renderCard } from "./card";
import { initSoundUnlock } from "./sound";
import { fetchBundle } from "./sync";
import { icons } from "./icons";

const PLATFORM_LABELS: Record<Platform, string> = {
  x: "X",
  youtube: "YouTube",
};

type Filter = "all" | Platform;

export function renderFeed(root: HTMLElement, initialItems: Item[]): void {
  initSoundUnlock();

  let items = initialItems;
  let currentFilter: Filter = "all";
  let io: IntersectionObserver | null = null;

  const show = (filter: Filter): void => {
    currentFilter = filter;
    io?.disconnect();
    root.replaceChildren();

    const list = filter === "all" ? items : items.filter((it) => it.platform === filter);
    const byEl = new Map<Element, Card>();
    for (const item of list) {
      const card = renderCard(item);
      byEl.set(card.el, card);
      root.appendChild(card.el);
    }

    io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const card = byEl.get(entry.target);
          if (!card) continue;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) card.activate();
          else card.deactivate();
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    for (const card of byEl.values()) io.observe(card.el);
    root.scrollTo({ top: 0 });
  };

  // One-tap sync: pull the latest bundle from the companion, re-render in place.
  const sync = async (btn: HTMLButtonElement): Promise<void> => {
    btn.classList.add("is-spinning");
    const fresh = await fetchBundle();
    if (fresh && fresh.length > 0) {
      items = fresh;
      show(currentFilter);
    }
    btn.classList.remove("is-spinning");
  };

  mountChrome(root, platformsIn(items), show, sync);
  show("all");
}

function platformsIn(items: Item[]): Platform[] {
  const seen = new Set<Platform>();
  for (const item of items) seen.add(item.platform);
  return [...seen];
}

function mountChrome(
  root: HTMLElement,
  platforms: Platform[],
  onSelect: (f: Filter) => void,
  onSync: (btn: HTMLButtonElement) => void,
): void {
  const body = root.parentElement;
  if (!body) return;

  const topbar = document.createElement("header");
  topbar.className = "topbar";

  const menu = iconButton("Menu", "&#9776;");

  const tabs = document.createElement("nav");
  tabs.className = "tabs";

  const filters: Array<{ key: Filter; label: string }> = [
    { key: "all", label: "All" },
    ...platforms.map((p) => ({ key: p, label: PLATFORM_LABELS[p] })),
  ];

  let active: HTMLButtonElement | null = null;
  for (const f of filters) {
    const tab = document.createElement("button");
    tab.className = "tab";
    tab.type = "button";
    tab.textContent = f.label;
    if (f.key === "all") {
      tab.classList.add("tab--active");
      active = tab;
    }
    tab.addEventListener("click", () => {
      active?.classList.remove("tab--active");
      tab.classList.add("tab--active");
      active = tab;
      onSelect(f.key);
    });
    tabs.appendChild(tab);
  }

  const syncBtn = document.createElement("button");
  syncBtn.className = "topbar__icon topbar__sync";
  syncBtn.type = "button";
  syncBtn.setAttribute("aria-label", "Sync");
  syncBtn.innerHTML = icons.sync;
  syncBtn.addEventListener("click", () => onSync(syncBtn));

  topbar.append(menu, tabs, syncBtn);

  const hint = document.createElement("div");
  hint.className = "sound-hint";
  hint.innerHTML = `${icons.mute}<span>Tap for sound</span>`;

  body.append(topbar, hint);
}

function iconButton(label: string, glyph: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "topbar__icon";
  btn.type = "button";
  btn.setAttribute("aria-label", label);
  btn.innerHTML = glyph;
  return btn;
}
