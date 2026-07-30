import { jsPDF } from "jspdf";
import type { Toy } from "@/types/toy";

export function buildKartPdf(toys: Toy[], kidName: string): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  let y = margin;

  doc.setFillColor(27, 77, 62);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 72, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("KidsKatalog", margin, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Wish list for mom & dad", margin + 160, 44);

  y = 104;
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
    `${toys.length} toy${toys.length === 1 ? "" : "s"} · Affiliate links below`,
    margin,
    y,
  );
  y += 28;

  toys.forEach((toy, index) => {
    if (y > 700) {
      doc.addPage();
      y = margin;
    }

    doc.setFillColor(245, 247, 244);
    doc.roundedRect(margin, y - 14, 516, 78, 8, 8, "F");

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
    const url = toy.affiliateUrl;
    const clipped =
      url.length > 78 ? `${url.slice(0, 75)}...` : url;
    doc.textWithLink(clipped, margin + 14, y + 56, { url });

    y += 96;
  });

  y = Math.max(y + 12, 720);
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text(
    "KidsKatalog is a browse-only catalog. Purchases happen on retailer sites via affiliate links.",
    margin,
    752,
  );

  return doc;
}

export function pdfToBase64(doc: jsPDF): string {
  const dataUri = doc.output("datauristring");
  return dataUri.split(",")[1] ?? "";
}

export function downloadKartPdf(toys: Toy[], kidName: string) {
  const doc = buildKartPdf(toys, kidName);
  const safe = (kidName.trim() || "kart").replace(/[^\w.-]+/g, "-");
  doc.save(`kidskatalog-${safe}.pdf`);
}
