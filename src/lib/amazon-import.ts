export { buildAffiliateUrl } from "@/lib/affiliate";
export {
  cleanAmazonToken,
  isShortAmazonLink,
  parseAsin,
  parseBulkAmazonInputs,
} from "@/lib/amazon-asin";

export async function downloadToyImage(imageUrl: string, slug: string): Promise<string> {
  const res = await fetch(imageUrl, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not download product image");

  const contentType = res.headers.get("content-type") || "image/jpeg";
  const bytes = Buffer.from(await res.arrayBuffer());

  const { persistToyImageBytes } = await import("@/lib/toy-image-store");
  const stored = await persistToyImageBytes(bytes, slug, contentType);
  if (stored) return stored;

  // Last resort on read-only hosts: keep the remote URL so save still works.
  if (imageUrl.startsWith("http")) return imageUrl;
  throw new Error(
    "Could not store product image. Set BLOB_READ_WRITE_TOKEN for production imports.",
  );
}
