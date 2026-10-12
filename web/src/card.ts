import type { Item } from "@reelmarks/shared";
import { type CardController, noopController } from "./controller";
import { mountYouTube } from "./embeds/youtube";
import { mountX } from "./embeds/x";
import { icons } from "./icons";

export interface Card {
  el: HTMLElement;
  activate(): void;
  deactivate(): void;
}

export function renderCard(item: Item): Card {
  const el = document.createElement("section");
  el.className = "card";

  const media = document.createElement("div");
  media.className = "card__media";
  el.appendChild(media);

  el.appendChild(buildCaption(item));
  el.appendChild(buildRail(item));

  // Lazy: build the (heavy) media controller only on first activation.
  let ctrl: CardController | null = null;
  const ensure = (): CardController => {
    if (!ctrl) ctrl = mountMedia(media, item);
    return ctrl;
  };

  return {
    el,
    activate() {
      ensure().activate();
    },
    deactivate() {
      ctrl?.deactivate();
    },
  };
}

function mountMedia(host: HTMLElement, item: Item): CardController {
  if (item.platform === "youtube" && item.embedUrl) return mountYouTube(host, item);
  if (item.platform === "x") return mountX(host, item);
  return mountFallback(host, item);
}

function mountFallback(host: HTMLElement, item: Item): CardController {
  const wrap = document.createElement("div");
  wrap.className = "embed embed--card";

  if (item.thumbnailUrl) {
    const img = document.createElement("img");
    img.className = "card__thumb";
    img.src = item.thumbnailUrl;
    img.alt = item.text ?? "";
    img.loading = "lazy";
    wrap.appendChild(img);
  }

  host.appendChild(wrap);
  return noopController;
}

// Bottom-left caption block, TikTok-style.
function buildCaption(item: Item): HTMLElement {
  const caption = document.createElement("div");
  caption.className = "caption";

  if (item.author) {
    const author = document.createElement("div");
    author.className = "caption__author";
    author.textContent = item.author.startsWith("@") ? item.author : `@${item.author}`;
    caption.appendChild(author);
  }

  if (item.text) {
    const text = document.createElement("div");
    text.className = "caption__text";
    text.textContent = item.text;
    caption.appendChild(text);
  }

  const meta = document.createElement("div");
  meta.className = "caption__meta";
  meta.innerHTML = `${icons.music}<span>saved from ${item.platform}</span>`;
  caption.appendChild(meta);

  return caption;
}

// Right-side vertical action rail, TikTok-style.
function buildRail(item: Item): HTMLElement {
  const rail = document.createElement("div");
  rail.className = "rail";

  if (item.likes !== undefined) rail.appendChild(railButton(icons.heart, formatCount(item.likes)));
  if (item.replies !== undefined) {
    rail.appendChild(railButton(icons.comment, formatCount(item.replies)));
  }

  const saved = railButton(icons.bookmark, "Saved");
  saved.classList.add("rail__btn--saved");
  rail.appendChild(saved);

  // The only control that navigates to the source page.
  const open = railButton(icons.share, "Open");
  open.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(item.sourceUrl, "_blank", "noopener");
  });
  rail.appendChild(open);

  return rail;
}

function formatCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function railButton(svg: string, label: string): HTMLElement {
  const btn = document.createElement("button");
  btn.className = "rail__btn";
  btn.type = "button";
  btn.innerHTML = `<span class="rail__icon">${svg}</span><span class="rail__label">${label}</span>`;
  return btn;
}
