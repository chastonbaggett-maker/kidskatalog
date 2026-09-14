import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { Toy } from "@/types/toy";
import { parentToyUrl, parentWishlistUrl } from "@/lib/parent-paths";

const ASSOCIATES_DISCLOSURE =
  "KidsKatalog is a participant in the Amazon Services LLC Associates Program. As an Amazon Associate we earn from qualifying purchases. Buy links open Parent Mode — not kid pages.";

async function qrPng(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 160,
    errorCorrectionLevel: "M",
    color: { dark: "#1B4D3E", light: "#FFFFFF" },
  });
}

export async function buildKartPdf(
  toys: Toy[],
  kidName: string,
  origin: string,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const wishlistUrl = parentWishlistUrl(
    toys.map((toy) => toy.id),
    origin,
  );
  const coverQr = await qrPng(wishlistUrl);

  doc.setFillColor(27, 77, 62);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 72, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("KidsKatalog", margin, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Wish list for mom & dad", margin + 160, 44);

  let y = 104;
  doc.setTextColor(27, 77, 62);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(
    kidName.trim() ? `${kidName.trim()}'s Kart` : "My Kart",
    margin,
    y,
  );
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(
    `${toys.length} toy${toys.length === 1 ? "" : "s"} · Scan to open Parent Mode`,
    margin,
    y,
  );

  doc.addImage(coverQr, "PNG", 480, 88, 72, 72);
  y = 176;

  for (let index = 0; index < toys.length; index += 1) {
    const toy = toys[index]!;
    if (y > 680) {
      doc.addPage();
      y = margin;
    }

    const parentUrl = parentToyUrl(toy.id, origin);
    const itemQr = await qrPng(parentUrl);

    doc.setFillColor(245, 247, 244);
    doc.roundedRect(margin, y - 14, 516, 96, 8, 8, "F");

    doc.setTextColor(27, 77, 62);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`${index + 1}. ${toy.name}`, margin + 14, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text(toy.blurb, margin + 14, y + 24);
    doc.text(`Ages ${toy.ageMin}–${toy.ageMax}`, margin + 14, y + 40);

    doc.setTextColor(30, 100, 70);
    doc.setFontSize(9);
    const clipped = parentUrl.length > 62 ? `${parentUrl.slice(0, 59)}...` : parentUrl;
    doc.textWithLink(clipped, margin + 14, y + 58, { url: parentUrl });

    doc.addImage(itemQr, "PNG", 516, y - 6, 40, 40);

    y += 114;
  }

  y = Math.max(y + 12, 720);
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  const disclosure = doc.splitTextToSize(ASSOCIATES_DISCLOSURE, 516);
  doc.text(disclosure, margin, 740);

  return doc;
}

export function pdfToBase64(doc: jsPDF): string {
  const dataUri = doc.output("datauristring");
  return dataUri.split(",")[1] ?? "";
}

export async function downloadKartPdf(
  toys: Toy[],
  kidName: string,
  origin: string,
) {
  const doc = await buildKartPdf(toys, kidName, origin);
  const safe = (kidName.trim() || "kart").replace(/[^\w.-]+/g, "-");
  doc.save(`kidskatalog-${safe}.pdf`);
}
