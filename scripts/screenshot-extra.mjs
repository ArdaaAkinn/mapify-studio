import { chromium } from "playwright";

const BASE = process.env.APP_URL || "http://localhost:5173";
const targets = [
  { name: "russia", path: "/maps/russia" },
  { name: "italy", path: "/maps/italy" },
  { name: "usa-counties", path: "/maps/usa", view: "Counties" },
  { name: "europe-nuts3", path: "/maps/europe", view: "NUTS-3" },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });

for (const t of targets) {
  await page.goto(BASE + t.path, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  if (t.view) {
    const btn = page.getByRole("button", { name: t.view });
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(1500);
    }
  }
  await page.screenshot({ path: `screenshots/extra-${t.name}.png` });
  console.log(`captured ${t.name}`);
}
await browser.close();
