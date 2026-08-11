import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  bulkAddDraftListings,
  type BulkAddResult,
} from "@/lib/bulk-add-listings";
import type { GenerateProgressEvent } from "@/lib/generate-listings";

export const maxDuration = 300;

type BulkProgressEvent =
  | GenerateProgressEvent
  | { type: "bulk-done"; result: BulkAddResult };

export async function POST(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let text = "";
  try {
    const body = (await req.json()) as { text?: string; urls?: string };
    text = String(body.text ?? body.urls ?? "").trim();
  } catch {
    return NextResponse.json(
      { error: "Expected JSON body with text containing Amazon URLs" },
      { status: 400 },
    );
  }

  if (!text) {
    return NextResponse.json(
      { error: "Paste up to 100 Amazon product URLs" },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: BulkProgressEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      void bulkAddDraftListings(text, send)
        .then((result) => {
          send({ type: "bulk-done", result });
          controller.close();
        })
        .catch((e) => {
          send({
            type: "error",
            error: e instanceof Error ? e.message : "Bulk add failed",
          });
          controller.close();
        });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
