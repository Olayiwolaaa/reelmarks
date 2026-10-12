// Global sound-unlock. Browsers block autoplay-with-sound until the user
// interacts with the page once; after that first gesture we flip sound on for
// every card and notify any active player to unmute.
let soundOn = false;
const listeners = new Set<() => void>();

export function isSoundEnabled(): boolean {
  return soundOn;
}

export function onSoundEnabled(fn: () => void): void {
  listeners.add(fn);
}

export function initSoundUnlock(): void {
  const unlock = (): void => {
    if (soundOn) return;
    soundOn = true;
    document.body.classList.add("sound-on");
    for (const fn of listeners) fn();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}
