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
 * Persist a toy image for production (Vercel Blob) or local `public/toys`.
 * Returns null when neither store is writable (caller may keep the remote URL).
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

/** Persist a product video clip (mp4/webm) next to toy images. */
export async function persistToyVideoBytes(
  bytes: Buffer,
  fileStem: string,
  contentType = "video/mp4",
): Promise<string | null> {
  const ext = contentType.includes("webm") ? "webm" : "mp4";
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

  try {
    const dir = path.join(process.cwd(), "public", "toys");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), bytes);
    return `/toys/${fileName}`;
  } catch (error) {
    console.warn("persistToyVideoBytes local write failed", error);
    return null;
  }
}

async function ffmpegHlsToMp4(
  m3u8Url: string,
  userAgent: string,
): Promise<Buffer | null> {
  const { spawn } = await import("child_process");
  const { randomBytes } = await import("crypto");
  const { tmpdir } = await import("os");
  const { readFile, unlink } = await import("fs/promises");

  const outPath = path.join(
    tmpdir(),
    `kk-vid-${randomBytes(8).toString("hex")}.mp4`,
  );

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        "ffmpeg",
        [
          "-y",
          "-hide_banner",
          "-loglevel",
          "error",
          "-user_agent",
          userAgent,
          "-i",
          m3u8Url,
          "-c",
          "copy",
          "-bsf:a",
          "aac_adtstoasc",
          "-movflags",
          "+faststart",
          outPath,
        ],
        { stdio: "ignore" },
      );

      const timer = setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch {
          /* ignore */
        }
        reject(new Error("ffmpeg timeout"));
      }, 90_000);

      proc.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      proc.on("exit", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exit ${code}`));
      });
    });

    const bytes = await readFile(outPath);
    return bytes.length > 0 ? bytes : null;
  } catch (error) {
    console.warn("ffmpeg HLS download failed", error);
    return null;
  } finally {
    await unlink(outPath).catch(() => undefined);
  }
}

/**
 * Download a remote product video and store it (Blob or public/toys).
 * HLS (.m3u8) is remuxed to MP4 with ffmpeg when available.
 * Returns the stored path/URL, or the original URL if persistence fails.
 */
export async function downloadAndStoreVideo(
  videoUrl: string,
  stem: string,
  userAgent?: string,
): Promise<string> {
  const ua =
    userAgent ||
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const url = videoUrl.trim();
  if (!url) return url;

  const fileStem = `${stem}-video`;

  try {
    if (/\.m3u8(\?|$)/i.test(url)) {
      const bytes = await ffmpegHlsToMp4(url, ua);
      if (bytes) {
        const stored = await persistToyVideoBytes(bytes, fileStem, "video/mp4");
        if (stored) return stored;
      }
      // Keep HLS URL — client PlayableVideo can stream it via hls.js.
      return url;
    }

    const res = await fetch(url, {
      headers: { "User-Agent": ua, Accept: "video/*,*/*;q=0.8" },
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) return url;

    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length < 256) return url;

    const contentType = (res.headers.get("content-type") || "video/mp4")
      .split(";")[0]!
      .trim();
    const stored = await persistToyVideoBytes(
      bytes,
      fileStem,
      contentType.includes("webm") ? "video/webm" : "video/mp4",
    );
    return stored || url;
  } catch (error) {
    console.warn("downloadAndStoreVideo failed", error);
    return url;
  }
}

/**
 * Download remote product images, process them, and store via Blob (prod) or disk (dev).
 * Falls back to the original remote URLs when persistence is unavailable so imports
 * still succeed on Vercel without a writable public/ folder.
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
