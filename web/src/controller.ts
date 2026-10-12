export interface CardController {
  /** Card is the active one on screen — start playback. */
  activate(): void;
  /** Card scrolled away — pause/stop. */
  deactivate(): void;
}

export const noopController: CardController = {
  activate() {},
  deactivate() {},
};
