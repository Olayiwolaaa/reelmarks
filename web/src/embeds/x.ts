import type { Item } from "@reelmarks/shared";
import { type CardController, noopController } from "../controller";
import { isSoundEnabled, onSoundEnabled } from "../sound";
import { icons } from "../icons";

const X_LOGO = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-7.5 8.6L23 22h-6.8l-5.3-7-6.1 7H1.6l8-9.2L1 2h7l4.8 6.4L18.9 2zm-1.2 18h1.9L7.1 4H5.1l12.6 16z"/></svg>`;
const VERIFIED = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22.5 12.5c0-1.6-.9-3-2.3-3.7.3-1.5-.2-3.1-1.4-4.2-1.1-1.1-2.7-1.6-4.2-1.4C13.9 1.9 12.5 1 11 1s-3 .9-3.7 2.2C5.8 3 4.2 3.5 3.1 4.6 2 5.7 1.5 7.3 1.7 8.8.3 9.5-.5 10.9-.5 12.5s.8 3 2.2 3.7c-.2 1.5.3 3.1 1.4 4.2 1.1 1.1 2.7 1.6 4.2 1.4.7 1.3 2.1 2.2 3.7 2.2s3-.9 3.7-2.2c1.5.2 3.1-.3 4.2-1.4 1.1-1.1 1.6-2.7 1.4-4.2 1.3-.7 2.2-2.1 2.2-3.7zm-12.1 4.1L6 12.2l1.6-1.6 2.7 2.7 5.5-5.5L17.5 9.4l-7.1 7.2z" transform="translate(1 0)"/></svg>`;

function hue(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) % 360;
  }
  return h;
}

function letterAvatar(item: Item): HTMLElement {
  const letter = document.createElement("div");
  letter.className = "tweet__avatar";
  letter.style.setProperty("--h", String(hue(item.author ?? item.id)));
  letter.textContent = (item.authorName ?? item.author ?? "?")
    .replace(/^@/, "")
    .charAt(0)
    .toUpperCase();
  return letter;
}

function buildAvatar(item: Item): HTMLElement {
  if (item.authorAvatarUrl) {
    const img = document.createElement("img");
    img.className = "tweet__avatar";
    img.src = item.authorAvatarUrl;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", () => img.replaceWith(letterAvatar(item)));
    return img;
  }
  return letterAvatar(item);
}

export function mountX(host: HTMLElement, item: Item): CardController {
  const backdrop = document.createElement("div");
  backdrop.className = "xcard";
  backdrop.style.setProperty("--h", String(hue(item.author ?? item.id)));

  // Backdrop precedence: tweet's own media first (crisp), else the author's
  // photo (blurred).
  const bgSrc = item.mediaUrl ?? item.backgroundImageUrl;
  if (bgSrc) {
    backdrop.classList.add(item.mediaUrl ? "xcard--media" : "xcard--photo");
    const bg = document.createElement("div");
    bg.className = "xcard__bg";
    bg.style.backgroundImage = `url("${bgSrc}")`;
    backdrop.appendChild(bg);
  }

  const card = document.createElement("div");
  card.className = "tweet";

  const header = document.createElement("div");
  header.className = "tweet__header";

  header.appendChild(buildAvatar(item));

  const names = document.createElement("div");
  names.className = "tweet__names";

  const name = document.createElement("div");
  name.className = "tweet__name";
  name.textContent = item.authorName ?? (item.author ?? "").replace(/^@/, "");
  if (item.verified) {
    const badge = document.createElement("span");
    badge.className = "tweet__verified";
    badge.innerHTML = VERIFIED;
    name.appendChild(badge);
  }
  names.appendChild(name);

  if (item.author) {
    const handle = document.createElement("div");
    handle.className = "tweet__handle";
    handle.textContent = item.author.startsWith("@") ? item.author : `@${item.author}`;
    names.appendChild(handle);
  }
  header.appendChild(names);

  const logo = document.createElement("div");
  logo.className = "tweet__logo";
  logo.innerHTML = X_LOGO;
  header.appendChild(logo);

  card.appendChild(header);

  if (item.text) {
    const text = document.createElement("div");
    text.className = "tweet__text";
    if (item.videoUrl || item.mediaUrl) text.classList.add("tweet__text--clamp");
    text.textContent = item.text;
    card.appendChild(text);
  }

  if (item.mediaUrl) {
    const media = document.createElement("div");
    media.className = "tweet__media";
    const img = document.createElement("img");
    img.src = item.mediaUrl;
    img.alt = "";
    img.loading = "lazy";
    media.appendChild(img);
    card.appendChild(media);
  }

  // Native video — rendered inline like X, autoplays muted, plays/pauses with
  // the card, tap toggles play/pause, unmutes once the user enables sound.
  let controller: CardController = noopController;
  if (item.videoUrl) {
    const wrap = document.createElement("div");
    wrap.className = "tweet__video is-paused";

    const video = document.createElement("video");
    video.src = item.videoUrl;
    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("webkit-playsinline", "true");
    wrap.appendChild(video);

    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = "tweet__playbtn";
    playBtn.setAttribute("aria-label", "Play or pause");
    playBtn.innerHTML = icons.play;
    wrap.appendChild(playBtn);

    card.appendChild(wrap);

    const sync = (): void => {
      wrap.classList.toggle("is-paused", video.paused);
    };
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    video.addEventListener("error", () => wrap.classList.add("is-error"));

    // Always start muted so the browser permits autoplay, then unmute if the
    // user has enabled sound — programmatic unmuted play() gets blocked.
    const playMuted = (): void => {
      video.muted = true;
      void video
        .play()
        .then(() => {
          if (isSoundEnabled()) video.muted = false;
        })
        .catch(() => {});
    };

    // Tap the video to toggle — and don't let it bubble elsewhere.
    wrap.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (video.paused) playMuted();
      else video.pause();
    });

    onSoundEnabled(() => {
      if (!video.paused) video.muted = false;
    });

    controller = {
      activate() {
        playMuted();
      },
      deactivate() {
        video.pause();
      },
    };
  }

  const footerText = [fmtDate(item.postedAt), fmtViews(item.views)].filter(Boolean);
  if (footerText.length > 0) {
    const footer = document.createElement("div");
    footer.className = "tweet__footer";
    if (item.postedAt) {
      const date = document.createElement("span");
      date.textContent = fmtDate(item.postedAt);
      footer.appendChild(date);
    }
    if (item.views !== undefined) {
      if (item.postedAt) footer.appendChild(document.createTextNode(" · "));
      const views = document.createElement("span");
      views.innerHTML = `<b>${fmtViews(item.views)}</b> Views`;
      footer.appendChild(views);
    }
    card.appendChild(footer);
  }

  backdrop.appendChild(card);
  host.appendChild(backdrop);

  return controller;
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtViews(n?: number): string {
  if (n === undefined) return "";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}
