import type { Item } from "@reelmarks/shared";
import type { CardController } from "../controller";
import { isSoundEnabled, onSoundEnabled } from "../sound";

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  setVolume(v: number): void;
}

interface YTPlayerOptions {
  videoId: string;
  playerVars: Record<string, string | number>;
  events: { onReady: () => void };
}

interface YTNamespace {
  Player: new (el: HTMLElement, opts: YTPlayerOptions) => YTPlayer;
}

type YTWindow = Window & {
  YT?: YTNamespace;
  onYouTubeIframeAPIReady?: () => void;
};

let apiPromise: Promise<YTNamespace> | null = null;

function loadApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve) => {
    const w = window as YTWindow;
    if (w.YT?.Player) {
      resolve(w.YT);
      return;
    }
    w.onYouTubeIframeAPIReady = () => {
      if (w.YT) resolve(w.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
  return apiPromise;
}

function parseVideoId(item: Item): string {
  const fromEmbed = item.embedUrl?.match(/\/embed\/([^?/]+)/)?.[1];
  if (fromEmbed) return fromEmbed;
  return item.sourceUrl.match(/[?&]v=([^&]+)/)?.[1] ?? "";
}

export function mountYouTube(host: HTMLElement, item: Item): CardController {
  const videoId = parseVideoId(item);
  const target = document.createElement("div");
  target.className = "embed embed--youtube";
  host.appendChild(target);

  let player: YTPlayer | null = null;
  let wantPlay = false;

  const applySound = (): void => {
    if (!player) return;
    if (isSoundEnabled()) {
      player.unMute();
      player.setVolume(100);
    } else {
      player.mute();
    }
  };

  void loadApi().then((YT) => {
    player = new YT.Player(target, {
      videoId,
      playerVars: {
        autoplay: wantPlay ? 1 : 0,
        mute: 1,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        loop: 1,
        playlist: videoId,
      },
      events: {
        onReady: () => {
          applySound();
          if (wantPlay) player?.playVideo();
        },
      },
    });
  });

  onSoundEnabled(() => {
    if (wantPlay) applySound();
  });

  return {
    activate() {
      wantPlay = true;
      applySound();
      player?.playVideo();
    },
    deactivate() {
      wantPlay = false;
      player?.pauseVideo();
    },
  };
}
