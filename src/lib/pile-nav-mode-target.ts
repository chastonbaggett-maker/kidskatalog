let modeRowEl: HTMLElement | null = null;
const listeners = new Set<() => void>();

export function registerPileNavModeRow(el: HTMLElement | null) {
  modeRowEl = el;
  listeners.forEach((listener) => listener());
}

export function getPileNavModeRow(): HTMLElement | null {
  return modeRowEl;
}

export function subscribePileNavModeRow(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
