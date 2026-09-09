import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:8721";
const artifactDir = "C:\\Users\\User\\AppData\\Local\\Temp\\opencode\\browser-artifacts\\reskin";
if (!existsSync(artifactDir)) mkdirSync(artifactDir, { recursive: true });

const SHOT = "viewport_resized";
let counter = 0;

const visButton = (page, label) => page.locator(`[role="button"]:visible`).filter({ hasText: label }).first();
const visInput = (page, placeholder) => page.locator(`input[placeholder="${placeholder}"]:visible`);
const waitForURL = (page, re, timeout = 25000) => page.waitForURL(re, { timeout });

async function shot(page, name) {
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(artifactDir, name), fullPage: true });
  console.log(`captured ${name}`);
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const email = `reskin.qa.${Date.now()}@example.com`;
  const password = "CarvenQA123!";

  // --- Onboarding, mobile ---
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    const errors = [];
    p.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
    const nav = Date.now();
    await p.goto(BASE, { waitUntil: "domcontentloaded" });
    await p.getByText("What is your style?", { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
    console.log(`onboarding mobile fcp-like ${Date.now() - nav}ms`);
    await shot(p, "01-onboarding-mobile.png");
    await p.close();
    if (errors.some((e) => !e.includes("404") && !e.includes("406"))) console.log(`console errors: ${errors.join(" | ")}`);
  }

  // --- Onboarding, desktop ---
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(BASE, { waitUntil: "domcontentloaded" });
    await p.getByText("What is your style?", { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
    await shot(p, "02-onboarding-desktop.png");
    await p.close();
  }

  // --- Sign up desktop -> home -> product ---
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(BASE, { waitUntil: "domcontentloaded" });
    await p.getByText("Sign in", { exact: true }).first().click();
    await waitForURL(p, /\/login$/);
    await visButton(p, "Create an account").click();
    await waitForURL(p, /\/signup$/);
    await visInput(p, "Your name").fill("Reskin QA");
    await visInput(p, "your@email.com").fill(email);
    await visInput(p, "Min. 8 characters").fill(password);
    await visInput(p, "Re-enter password").fill(password);
    const nav = Date.now();
    await visButton(p, "Create account").click();
    await waitForURL(p, /\/home$/);
    await p.waitForTimeout(1200);
    console.log(`home desktop reached ${Date.now() - nav}ms after submit`);
    await shot(p, "03-home-desktop.png");
    await p.locator('[aria-label^="View "]:not([aria-label="View saved furniture"]):not([aria-label="View cart"])').first().click();
    await p.waitForTimeout(1500);
    await shot(p, "04-product-desktop.png");
    await p.close();
  }

  // --- Mobile home + product (same session cookie via login) ---
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
    await p.waitForTimeout(1200);
    await shot(p, "05-home-mobile.png");
    await p.locator('[aria-label^="View "]:not([aria-label="View saved furniture"]):not([aria-label="View cart"])').first().click();
    await p.waitForTimeout(1500);
    await shot(p, "06-product-mobile.png");
    await p.close();
  }

  console.log(`artifacts in ${artifactDir}`);
} finally {
  await browser.close();
}