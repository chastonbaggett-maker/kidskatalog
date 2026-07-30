import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getToysByIds } from "@/data/toys";
import { buildKartPdf, pdfToBase64 } from "@/lib/pdf";

export const runtime = "nodejs";

type Body = {
  kidName?: string;
  parentEmail?: string;
  toyIds?: string[];
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const kidName = (body.kidName || "").trim();
  const parentEmail = (body.parentEmail || "").trim();
  const toyIds = Array.isArray(body.toyIds) ? body.toyIds : [];

  if (!kidName || !parentEmail || toyIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Name, email, and toys are required" },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
    return NextResponse.json(
      { ok: false, error: "That email looks wrong" },
      { status: 400 },
    );
  }

  const toys = getToysByIds(toyIds);
  if (toys.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No toys found in Kart" },
      { status: 400 },
    );
  }

  const pdf = buildKartPdf(toys, kidName);
  const pdfBase64 = pdfToBase64(pdf);
  const filename = `kidskatalog-${kidName.replace(/[^\w.-]+/g, "-")}.pdf`;

  const listHtml = toys
    .map(
      (t, i) =>
        `<li style="margin:0 0 12px">
          <strong>${i + 1}. ${escapeHtml(t.name)}</strong><br/>
          <span style="color:#555">${escapeHtml(t.blurb)}</span><br/>
          <a href="${t.affiliateUrl}">Buy link</a>
        </li>`,
    )
    .join("");

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const resend = new Resend(apiKey);
  const from =
    process.env.RESEND_FROM_EMAIL || "KidsKatalog <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from,
    to: parentEmail,
    subject: `${kidName}'s KidsKatalog wish list`,
    html: `
      <div style="font-family:Georgia,serif;color:#1B4D3E">
        <h1 style="margin:0 0 8px">KidsKatalog</h1>
        <p style="color:#444">${escapeHtml(kidName)} picked these toys. PDF attached with affiliate links.</p>
        <ol style="padding-left:18px">${listHtml}</ol>
        <p style="color:#888;font-size:12px">KidsKatalog is browse-only. Purchases happen on retailer sites.</p>
      </div>
    `,
    attachments: [
      {
        filename,
        content: pdfBase64,
      },
    ],
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Email failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
