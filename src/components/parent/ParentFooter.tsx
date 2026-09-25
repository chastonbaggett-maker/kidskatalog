import { AssociatesDisclosure } from "@/components/parent/AssociatesDisclosure";

export function ParentFooter() {
  return (
    <footer
      data-testid="parent-footer"
      className="shrink-0 border-t border-[var(--lavender)] bg-white/80 px-4 py-3"
    >
      <AssociatesDisclosure className="mx-auto max-w-3xl text-center" />
    </footer>
  );
}
