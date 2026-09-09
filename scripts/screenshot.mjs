// One-off visual verification helper — not part of the app build.
// Usage: node scripts/screenshot.mjs <out-prefix>
import { chromium } from "playwright";

const BASE = process.env.APP_URL || "http://localhost:5174";
const prefix = process.argv[2] || "shot";

const targets = [
  { name: "globe", path: "/" },
  { name: "turkey-districts", path: "/maps/turkey", view: "districts" },
  { name: "brazil", path: "/maps/brazil" },
  { name: "greece", path: "/maps/greece" },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });

for (const t of targets) {
  await page.goto(BASE + t.path, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  if (t.path === "/") {
    // Landing page loads onto the globe — give it a moment to settle/rotate into place.
    await page.waitForTimeout(1500);
  }

  if (t.view === "districts") {
    const btn = page.getByRole("button", { name: "Districts" });
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(1500);
    }
  }

  await page.screenshot({ path: `screenshots/${prefix}-${t.name}.png` });
  console.log(`captured ${t.name}`);
}

await browser.close();
