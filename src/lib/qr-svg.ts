import QRCode from "qrcode";

/** Local SVG only. Never call a third-party QR host. */
export async function qrSvg(text: string): Promise<string> {
  const svg = await QRCode.toString(text, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#1C2430", light: "#FFFFFF" },
  });
  if (!svg.includes("<svg") || /<script/i.test(svg)) {
    throw new Error("Could not build a QR code");
  }
  return svg;
}
