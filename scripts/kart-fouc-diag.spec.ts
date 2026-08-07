import { test, expect } from "@playwright/test";

test("detect FOUC / unstyled text on add-to-kart click", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/toy/sky-rocket", { waitUntil: "networkidle" });
  await page.waitForSelector(".add-kart-btn");
  await page.evaluate(() => localStorage.removeItem("kidskatalog-kart"));
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    type Sample = {
      t: number;
      bodyFont: string;
      bodyBg: string;
      btnBg: string;
      inkColor: string;
      sheetCount: number;
      disabledSheets: number;
      cssRulesOk: boolean;
      htmlClass: string;
      htmlData: string;
      displayFont: string;
    };
    const samples: Sample[] = [];
    (window as unknown as { __fouc: Sample[] }).__fouc = samples;
    const t0 = performance.now();

    const scan = () => {
      let disabledSheets = 0;
      let cssRulesOk = true;
      for (const sheet of Array.from(document.styleSheets)) {
        const node = sheet.ownerNode as HTMLElement | null;
        if (node && "disabled" in node && (node as HTMLLinkElement).disabled) {
          disabledSheets += 1;
        }
        try {
          // Accessing cssRules can throw if stylesheet is mid-reload.
          void sheet.cssRules?.length;
        } catch {
          cssRulesOk = false;
        }
      }

      const heading = document.querySelector("h2");
      samples.push({
        t: Math.round(performance.now() - t0),
        bodyFont: getComputedStyle(document.body).fontFamily,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        btnBg: getComputedStyle(
          document.querySelector(".add-kart-btn") ?? document.body,
        ).backgroundColor,
        inkColor: heading
          ? getComputedStyle(heading).color
          : getComputedStyle(document.body).color,
        sheetCount: document.styleSheets.length,
        disabledSheets,
        cssRulesOk,
        htmlClass: document.documentElement.className,
        htmlData: document.documentElement.getAttributeNames().join("|"),
        displayFont: heading ? getComputedStyle(heading).fontFamily : "",
      });
      if (performance.now() - t0 < 1000) requestAnimationFrame(scan);
    };
    requestAnimationFrame(scan);
  });

  await page.locator(".add-kart-btn").click();
  await page.waitForTimeout(1100);

  const result = await page.evaluate(() => {
    const samples =
      (window as unknown as { __fouc: Array<Record<string, unknown>> }).__fouc ??
      [];

    const baseline = samples[0];
    const deltas = samples.filter((s) => {
      if (!baseline) return false;
      return (
        s.bodyFont !== baseline.bodyFont ||
        s.displayFont !== baseline.displayFont ||
        s.sheetCount !== baseline.sheetCount ||
        s.disabledSheets !== baseline.disabledSheets ||
        s.cssRulesOk !== baseline.cssRulesOk ||
        s.htmlClass !== baseline.htmlClass
      );
    });

    const looksUnstyled = samples.filter((s) => {
      const font = String(s.bodyFont || "").toLowerCase();
      const display = String(s.displayFont || "").toLowerCase();
      return (
        font.includes("times") ||
        display.includes("times") ||
        (!font.includes("nunito") && !font.includes("fredoka")) ||
        s.cssRulesOk === false ||
        (s.disabledSheets as number) > 0
      );
    });

    return {
      baseline,
      deltaCount: deltas.length,
      deltas: deltas.slice(0, 8),
      unstyledCount: looksUnstyled.length,
      unstyled: looksUnstyled.slice(0, 8),
      uniqueFonts: [...new Set(samples.map((s) => s.bodyFont))],
      uniqueDisplayFonts: [...new Set(samples.map((s) => s.displayFont))],
      sheetRange: [
        Math.min(...samples.map((s) => s.sheetCount as number)),
        Math.max(...samples.map((s) => s.sheetCount as number)),
      ],
      htmlDataChanges: [
        ...new Set(samples.map((s) => s.htmlData as string)),
      ],
    };
  });

  console.log("FOUC_DIAG", JSON.stringify(result, null, 2));
  expect(result.unstyledCount, JSON.stringify(result.unstyled)).toBe(0);
  expect(
    result.sheetRange[0],
    "stylesheet count must stay stable (HMR FOUC)",
  ).toBe(result.sheetRange[1]);
  expect(
    result.htmlDataChanges.some((s) => s.includes("data-kart")),
    "kart state must not live on <html> attributes",
  ).toBe(false);
});
