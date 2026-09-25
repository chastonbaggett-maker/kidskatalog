import { AssociatesDisclosure } from "@/components/parent/AssociatesDisclosure";

export function ParentFooter() {
  return (
    <footer
      data-testid="parent-footer"
      className="shrink-0 border-t border-[var(--lavender)] bg-white/80 px-4 py-3"
    >
      <AssociatesDisclosure className="mx-auto max-w-3xl text-center" />
      <p className="mt-2 flex items-center justify-center gap-4 text-center">
        <a href="/privacy" className="text-sm font-bold text-[var(--blue-deep)]">
          Privacy
        </a>
        <a href="/kid-mode" data-testid="kid-mode-link" className="text-sm font-bold text-[var(--blue-deep)]">
          Kid Mode
        </a>
      </p>
    </footer>
  );
}
