import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  generateDraftListings,
  type GenerateProgressEvent,
} from "@/lib/generate-listings";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let count = 10;
  try {
    const body = (await req.json()) as { count?: number };
    if (typeof body.count === "number" && body.count > 0) {
      count = Math.min(20, Math.floor(body.count));
    }
  } catch {
    // default 10
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: GenerateProgressEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      void generateDraftListings(count, send)
        .then(() => {
          controller.close();
        })
        .catch((e) => {
          send({
            type: "error",
            error: e instanceof Error ? e.message : "Generate failed",
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
