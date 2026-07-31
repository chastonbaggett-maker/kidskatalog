let kartNavEl: HTMLElement | null = null;

export function registerKartNavEl(el: HTMLElement | null) {
  kartNavEl = el;
}

export function getKartNavRect(): DOMRect | null {
  return kartNavEl?.getBoundingClientRect() ?? null;
}
