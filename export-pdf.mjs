import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "Repudi-Kamala-Jeslyn-Portfolio-Desktop.pdf");
const url = "http://localhost:8080/";

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const height = await page.evaluate(() => document.documentElement.scrollHeight);

await page.pdf({
  path: outPath,
  width: "1920px",
  height: `${height}px`,
  printBackground: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
});

await browser.close();
console.log("PDF saved:", outPath);
