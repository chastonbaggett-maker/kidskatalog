export function BrandDealDisclosure({
  className = "",
  partner,
}: {
  className?: string;
  partner?: string;
}) {
  return (
    <p className={`text-xs leading-relaxed text-[var(--ink-soft)] ${className}`}>
      This is a brand partner link
      {partner ? ` for ${partner}` : ""}, not Amazon. KidsKatalog may earn a
      commission from the partner if a parent buys through this button. This
      click is not an Amazon Associates link and is not Amazon Product
      Advertising Content.
    </p>
  );
}
