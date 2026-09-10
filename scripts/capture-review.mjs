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
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
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
    await p.locator('[role="tab"][aria-label="Profile"]').first().click().catch(() => p.getByRole("tab", { name: "Profile" }).click());
    await waitForURL(p, /\/profile$/);
    await shot(p, "04-profile-desktop.png", true);
    await p.locator('[role="tab"][aria-label="Home"]').first().click().catch(() => p.getByRole("tab", { name: "Home" }).click());
    await waitForURL(p, /\/home$/);
    await p.locator('[role="tab"][aria-label="Place"]').first().click().catch(() => p.getByRole("tab", { name: "Place" }).click());
    await waitForURL(p, /\/image-placement$/);
    await shot(p, "05-placement-desktop.png", true);
    await p.locator('[role="tab"][aria-label="Home"]').first().click().catch(() => p.getByRole("tab", { name: "Home" }).click());
    await waitForURL(p, /\/home$/);
    await p.locator('[aria-label^="View "]:not([aria-label="View saved furniture"]):not([aria-label="View cart"])').first().click();
    await p.waitForTimeout(1400);
    await shot(p, "03-product-desktop.png", true);

    // Checkout 3-step flow
    await p.locator('[role="button"]').filter({ hasText: /BUY NOW/ }).first().click();
    await p.waitForTimeout(1200);
    await p.getByText("Ready to add", { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
    await visButton(p, "CONTINUE TO CHECKOUT").click();
    await waitForURL(p, /\/checkout$/);
    await p.locator('input[placeholder="Your full name"]:visible').fill("Finish QA");
    await p.locator('input[placeholder="+63 XXX XXX XXXX"]:visible').fill("+63 917 123 4567");
    await p.locator('input[placeholder="Street, Barangay"]:visible').fill("123 Test St");
    await p.locator('input[placeholder="City or municipality"]:visible').fill("Manila");
    await shot(p, "06-checkout-delivery-desktop.png", true);
    await visButton(p, "CONTINUE TO PAYMENT").click();
    await waitForURL(p, (u) => u.pathname.endsWith("/checkout-payment"));
    await shot(p, "07-checkout-payment-desktop.png", true);
    await visButton(p, "CONTINUE TO REVIEW").click();
    await waitForURL(p, (u) => u.pathname.endsWith("/checkout-review"));
    await shot(p, "08-checkout-review-desktop.png", true);
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