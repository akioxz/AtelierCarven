import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:8721";
const REV = "C:\\Users\\User\\Documents\\Personal Projects\\AtelierCarven\\.impeccable\\review";
if (!existsSync(REV)) mkdirSync(REV, { recursive: true });

const visButton = (page, label) => page.locator(`[role="button"]:visible`).filter({ hasText: label }).first();
const visInput = (page, placeholder) => page.locator(`input[placeholder="${placeholder}"]:visible`);
const waitForURL = (page, re, timeout = 25000) => page.waitForURL(re, { timeout });

let counter = 0;
async function shot(page, name, full = false) {
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(REV, name), fullPage: full });
  console.log(`captured ${name}`);
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const email = `finish.qa.${Date.now()}@example.com`;
  const password = "CarvenQA123!";

  // Desktop customer flow → home (the brief's first viewport).
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(BASE, { waitUntil: "domcontentloaded" });
    await p.getByText(/A considered home begins/i).first().waitFor({ state: "visible", timeout: 15000 });
    await shot(p, "01-onboarding-desktop.png", true);
    await p.getByText("Sign in", { exact: true }).first().click();
    await waitForURL(p, /\/login$/);
    await visButton(p, "Create an account").click();
    await waitForURL(p, /\/signup$/);
    await visInput(p, "Your name").fill("Finish QA");
    await visInput(p, "your@email.com").fill(email);
    await visInput(p, "Min. 8 characters").fill(password);
    await visInput(p, "Re-enter password").fill(password);
    await visButton(p, "Create account").click();
    await waitForURL(p, /\/home$/);
    await p.waitForTimeout(1300);
    await shot(p, "02-home-desktop.png", true);
    await p.locator('[aria-label^="View "]:not([aria-label="View saved furniture"]):not([aria-label="View cart"])').first().click();
    await p.waitForTimeout(1400);
    await shot(p, "03-product-desktop.png", true);
    await p.close();
  }

  // Mobile customer flow → home + product.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    await p.goto(BASE, { waitUntil: "domcontentloaded" });
    await p.getByText("Sign in", { exact: true }).first().click();
    await waitForURL(p, /\/login$/);
    await visInput(p, "your@email.com").fill(email);
    await visInput(p, "Min. 8 characters").fill(password);
    await visButton(p, "Sign in").click();
    await waitForURL(p, /\/home$/);
    await p.waitForTimeout(1300);
    await shot(p, "04-home-mobile.png", true);
    await p.locator('[aria-label^="View "]:not([aria-label="View saved furniture"]):not([aria-label="View cart"])').first().click();
    await p.waitForTimeout(1400);
    await shot(p, "05-product-mobile.png", true);
    await p.close();
  }

  console.log(`review rasters in ${REV}`);
} finally {
  await browser.close();
}