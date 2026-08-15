import "server-only";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { blobConfigured } from "@/lib/store-env";

const TARGET_LONG = 1500;

/**
 * Normalize a product photo to a white-backed JPEG (catalog card style).
 */
export async function processProductJpeg(input: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const flattened = await sharp(input)
    .rotate()
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();

  let trimmed: Buffer;
  try {
    trimmed = await sharp(flattened)
      .trim({
        background: { r: 255, g: 255, b: 255, alpha: 1 },
        threshold: 12,
      })
      .toBuffer();
  } catch {
    trimmed = flattened;
  }

  const meta = await sharp(trimmed).metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;
  const scale = TARGET_LONG / Math.max(w, h);

  return sharp(trimmed)
    .resize({
      width: Math.max(1, Math.round(w * scale)),
      height: Math.max(1, Math.round(h * scale)),
      fit: "fill",
      kernel: "lanczos3",
    })
    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
    .toBuffer();
}

/**
 * Persist a toy **image** for production (Vercel Blob) or local `public/toys`.
 * Returns null when neither store is writable (caller may keep the remote URL).
 * Do not use for videos — product videos stay as remote stream links only.
 */
export async function persistToyImageBytes(
  bytes: Buffer,
  fileStem: string,
  contentType = "image/jpeg",
): Promise<string | null> {
  const ext = contentType.includes("png") ? "png" : "jpg";
  const fileName = `${fileStem}.${ext}`;

  if (blobConfigured()) {
    const token = process.env.BLOB_READ_WRITE_TOKEN!.trim();
    const { put } = await import("@vercel/blob");
    const blob = await put(`kidskatalog/toys/${fileName}`, bytes, {
      access: "public",
      token,
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return blob.url;
  }

  // Local/dev filesystem — not available on Vercel serverless.
  try {
    const dir = path.join(process.cwd(), "public", "toys");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), bytes);
    return `/toys/${fileName}`;
  } catch (error) {
    console.warn("persistToyImageBytes local write failed", error);
    return null;
  }
}

/**
 * Download remote product **images**, process them, and store via Blob (prod) or disk (dev).
 * Falls back to the original remote URLs when persistence is unavailable so imports
 * still succeed on Vercel without a writable public/ folder.
 * Videos are never passed through here — keep remote links in `toy.videos`.
 */
export async function downloadAndStoreGallery(
  imageUrls: string[],
  stem: string,
  userAgent?: string,
): Promise<string[]> {
  const saved: string[] = [];
  const ua =
    userAgent ||
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  for (let i = 0; i < imageUrls.length; i += 1) {
    const url = imageUrls[i]!;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": ua },
        cache: "no-store",
      });
      if (!res.ok) {
        saved.push(url);
        continue;
      }
      const input = Buffer.from(await res.arrayBuffer());
      const fileStem = i === 0 ? stem : `${stem}-${i}`;

      let payload: Buffer = input;
      let contentType = "image/jpeg";
      try {
        payload = await processProductJpeg(input);
      } catch {
        contentType = res.headers.get("content-type") || "image/jpeg";
      }

      const stored = await persistToyImageBytes(payload, fileStem, contentType);
      saved.push(stored || url);
    } catch {
      saved.push(url);
    }
  }

  return saved.filter(Boolean);
}
