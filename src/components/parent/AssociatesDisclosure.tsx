export function AssociatesDisclosure({
  className = "",
  placeholder = false,
}: {
  className?: string;
  placeholder?: boolean;
}) {
  return (
    <p className={`text-xs leading-relaxed text-[var(--ink-soft)] ${className}`}>
      KidsKatalog is a participant in the Amazon Services LLC Associates Program,
      an affiliate advertising program designed to provide a means for sites to
      earn advertising fees by advertising and linking to Amazon.com. As an
      Amazon Associate we earn from qualifying purchases.
      {placeholder
        ? " Buy links are placeholders until Associates is approved — no live tagged Amazon URL yet."
        : null}
    </p>
  );
}
