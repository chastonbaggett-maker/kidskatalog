let appFxRoot: HTMLElement | null = null;

export function registerAppFxRoot(el: HTMLElement | null) {
  appFxRoot = el;
}

export function getAppFxRoot(): HTMLElement | null {
  return appFxRoot;
}
