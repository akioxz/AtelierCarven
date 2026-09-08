import { chromium } from "playwright";
import http from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const distDir = join(repoRoot, "dist");
const artifactDir = "C:/Users/User/AppData/Local/Temp/opencode/browser-artifacts";
const PORT = Number(process.env.PORT || 8721);
const BASE = `http://localhost:${PORT}`;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
};

const server = http.createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, BASE).pathname);
    if (path === "/") path = "/index.html";
    else if (!extname(path)) path += ".html";
    const data = await readFile(join(distDir, path));
    res.writeHead(200, { "Content-Type": TYPES[extname(path)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
  }
});

// Visible-only locator helpers (Stack keeps previous screens mounted, hidden)
const vis = (page, selector) => page.locator(`${selector}:visible`);
const visInput = (page, placeholder) => page.locator(`input[placeholder="${placeholder}"]:visible`);
const visButton = (page, label) => page.locator(`[aria-label="${label}"]:visible`);
const visTextBtn = (page, regex) =>
  page.locator('[role="button"]:visible').filter({ hasText: regex }).first();
const waitProducts = (page, timeout = 15000) =>
  page.waitForSelector('[aria-label^="Add "]:visible', { timeout, state: "visible" });

const failures = [];
const logs = [];
async function step(name, fn) {
  try {
    await fn();
    logs.push(`PASS  ${name}`);
  } catch (err) {
    failures.push(`${name}: ${err.message}`);
    logs.push(`FAIL  ${name}: ${err.message}`);
  }
}

const waitForURL = async (page, pattern, timeout = 15000) =>
  page.waitForURL((url) => pattern.test(url.pathname), { timeout });

function trackConsoleErrors(page) {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return { errors };
}

// Logged-out direct nav to any route bounces to /onboarding (root layout). Reach auth in-app.
async function goToLogin(page) {
  await page.goto(`${BASE}/onboarding`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.getByText("Sign in", { exact: true }).first().click();
  await waitForURL(page, /\/login$/);
  await page.waitForTimeout(800);
}

async function main() {
  await mkdir(artifactDir, { recursive: true });
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Serving ${distDir} on ${BASE}`);

  let browser;
  try {
    browser = await chromium.launch({ channel: "msedge", headless: true });
  } catch (err) {
    console.log(`Edge launch failed: ${err.message}`);
    browser = await chromium.launch({ headless: true });
  }

  const email = `qa.bot.${Date.now()}@example.com`;
  const password = "CarvenQA123!";

  // ---------- MOBILE width 390x844 ----------
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  trackConsoleErrors(mobile);
  const mErrors = [];

  await step("M [login back] login -> onboarding", async () => {
    const p = await mobile.newPage();
    const t = trackConsoleErrors(p);
    await goToLogin(p);
    await visButton(p, "Go back").click();
    await waitForURL(p, /\/onboarding$/);
    mErrors.push(...t.errors);
    await p.close();
  });

  await step("M [forgot back] forgot-password -> login", async () => {
    const p = await mobile.newPage();
    const t = trackConsoleErrors(p);
    await goToLogin(p);
    await visTextBtn(p, /Forgot password/i).click();
    await waitForURL(p, /\/forgot-password$/);
    await visButton(p, "Go back").click();
    await waitForURL(p, /\/login$/);
    mErrors.push(...t.errors);
    await p.close();
  });

  await step("M [signup back] signup -> login", async () => {
    const p = await mobile.newPage();
    const t = trackConsoleErrors(p);
    await goToLogin(p);
    await visButton(p, "Create an account").click();
    await waitForURL(p, /\/signup$/);
    await visButton(p, "Go back").click();
    await waitForURL(p, /\/login|\/onboarding/);
    mErrors.push(...t.errors);
    await p.close();
  });

  await step("M [bad creds] inline error, stay on login", async () => {
    const p = await mobile.newPage();
    const t = trackConsoleErrors(p);
    await goToLogin(p);
    await visInput(p, "your@email.com").fill("no.such.user@example.com");
    await visInput(p, "Min. 8 characters").fill("wrongpass123");
    await visButton(p, "Sign in").click();
    await p.getByText(/invalid login/i).first().waitFor({ state: "visible", timeout: 15000 });
    if (!/\/login$/.test(new URL(p.url()).pathname)) throw new Error("left /login after failed sign-in");
    mErrors.push(...t.errors);
    await p.close();
  });

  await step("M [forgot happy] success state after reset link", async () => {
    const p = await mobile.newPage();
    const t = trackConsoleErrors(p);
    await goToLogin(p);
    await visTextBtn(p, /Forgot password/i).click();
    await waitForURL(p, /\/forgot-password$/);
    await visInput(p, "your@email.com").fill(email);
    await visButton(p, "Send reset link").click();
    await visButton(p, "Back to sign in").waitFor({ state: "visible", timeout: 20000 });
    mErrors.push(...t.errors);
    await p.close();
  });

  // Signed-in flows (shared session persists in context origin localStorage)
  await step("M [signup] create account -> /home", async () => {
    const p = await mobile.newPage();
    trackConsoleErrors(p);
    await goToLogin(p);
    await visButton(p, "Create an account").click();
    await waitForURL(p, /\/signup$/);
    await visInput(p, "Your name").fill("QA Bot");
    await visInput(p, "your@email.com").fill(email);
    await visInput(p, "Min. 8 characters").fill(password);
    await visInput(p, "Re-enter password").fill(password);
    await visButton(p, "Create account").click();
    await waitForURL(p, /\/home$/);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: join(artifactDir, "01-home.png"), fullPage: true });
    await p.close();
  });

  const signedIn = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const sesErrors = [];
  {
    const p = await signedIn.newPage();
    const t = trackConsoleErrors(p);
    await goToLogin(p);
    await visInput(p, "your@email.com").fill(email);
    await visInput(p, "Min. 8 characters").fill(password);
    await visButton(p, "Sign in").click();
    await waitForURL(p, /\/home$/);
    sesErrors.push(...t.errors);
    await p.close();
  }

  const hasCards = await (async () => {
    const p = await signedIn.newPage();
    await p.goto(`${BASE}/home`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2000);
    const count = await p.locator('[aria-label^="View "]').count();
    await p.close();
    return count > 0;
  })();

  await step("M [empty cart] shows empty state", async () => {
    const p = await signedIn.newPage();
    const t = trackConsoleErrors(p);
    await p.goto(`${BASE}/home`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1800);
    await visButton(p, "View cart").click();
    await waitForURL(p, /\/cart$/);
    await p.getByText("Nothing here yet.").first().waitFor({ state: "visible", timeout: 10000 });
    sesErrors.push(...t.errors);
    await p.close();
  });

  if (hasCards) {
    await step("M [favorite] heart toggles to saved", async () => {
      const p = await signedIn.newPage();
      const t = trackConsoleErrors(p);
      await p.goto(`${BASE}/home`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1500);
      await waitProducts(p);
      await visButton(p, "Save furniture").first().click();
      await visButton(p, "Remove from saved").first().waitFor({ state: "visible", timeout: 10000 });
      await p.screenshot({ path: join(artifactDir, "02-favorited.png"), fullPage: true });
      sesErrors.push(...t.errors);
      await p.close();
    });

    await step("M [add to cart] + item, quantity stepper", async () => {
      const p = await signedIn.newPage();
      const t = trackConsoleErrors(p);
      await p.goto(`${BASE}/home`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1500);
      await waitProducts(p);
      await vis(p, '[aria-label*="to cart"]').first().click();
      await p.waitForTimeout(1000);
      await visButton(p, "View cart").click();
      await waitForURL(p, /\/cart$/);
      await p.waitForTimeout(800);
      await visButton(p, "Increase quantity").click();
      await p.waitForTimeout(600);
      await visButton(p, "Decrease quantity").click();
      await p.screenshot({ path: join(artifactDir, "03-cart.png"), fullPage: true });
      sesErrors.push(...t.errors);
      await p.close();
    });

    await step("M [product] opens, favorite toggles, back -> home", async () => {
      const p = await signedIn.newPage();
      const t = trackConsoleErrors(p);
      await p.goto(`${BASE}/home`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1500);
      await waitProducts(p);
      await vis(p, '[aria-label^="View "]:not([aria-label="View cart"]):not([aria-label="View saved furniture"])').first().click();
      await p.waitForURL((url) => url.pathname.startsWith("/product"), { timeout: 15000 });
      await p.waitForTimeout(1200);
      await p.screenshot({ path: join(artifactDir, "04-product.png"), fullPage: true });
      const heart = visButton(p, "Save to favorites");
      if ((await heart.count()) > 0) {
        await heart.click();
        await visButton(p, "Remove from saved").waitFor({ state: "visible", timeout: 5000 });
      }
      await visButton(p, "Go back").click();
      await waitForURL(p, /\/home$/);
      sesErrors.push(...t.errors);
      await p.close();
    });

    await step("M [no-history /cart back] fallback to home", async () => {
      const p = await signedIn.newPage();
      const t = trackConsoleErrors(p);
      await p.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1800);
      await visButton(p, "Go back").click();
      await waitForURL(p, /\/home$/);
      sesErrors.push(...t.errors);
      await p.close();
    });

    await step("M [no-history /checkout back] fallback to cart", async () => {
      const p = await signedIn.newPage();
      const t = trackConsoleErrors(p);
      await p.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1800);
      await visButton(p, "Go back").click();
      await waitForURL(p, /\/cart$/);
      sesErrors.push(...t.errors);
      await p.close();
    });

    await step("M [checkout] loads with COD, back -> cart", async () => {
      const p = await signedIn.newPage();
      const t = trackConsoleErrors(p);
      await p.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1800);
      const cont = visTextBtn(p, /\bCONTINUE TO CHECKOUT\b/i);
      if ((await cont.count()) === 0) throw new Error("cart has no items, CONTINUE missing");
      await cont.first().click();
      await waitForURL(p, /\/checkout$/);
      await p.waitForTimeout(800);
      const cod = visButton(p, "Pay with Cash on delivery");
      if ((await cod.count()) === 0) throw new Error("COD payment option missing");
      await cod.first().click();
      await p.screenshot({ path: join(artifactDir, "05-checkout.png"), fullPage: true });
      sesErrors.push(...t.errors);
      await p.close();
    });
  } else {
    logs.push("SKIP  (no furniture in DB) favorite/add-to-cart/product/checkout flows");
  }

  await step("M [favorites] back -> home", async () => {
    const p = await signedIn.newPage();
    const t = trackConsoleErrors(p);
    await p.goto(`${BASE}/home`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1800);
    await visButton(p, "View saved furniture").click();
    await waitForURL(p, /\/favorites$/);
    await visButton(p, "Go back").click();
    await waitForURL(p, /\/home$/);
    sesErrors.push(...t.errors);
    await p.close();
  });

  // ---------- DESKTOP spot-checks at 1280 ----------
  await step("D [bad creds] web card variant shows inline error", async () => {
    const d = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const p = await d.newPage();
    const t = trackConsoleErrors(p);
    await goToLogin(p);
    const emailInput = visInput(p, "your@email.com");
    if ((await emailInput.count()) === 0) throw new Error("no email input on desktop card");
    await emailInput.fill("no.such.user@example.com");
    await visInput(p, "Min. 8 characters").fill("wrongpass123");
    await visButton(p, "Sign in").click();
    await p.getByText(/invalid login/i).first().waitFor({ state: "visible", timeout: 15000 });
    // Desktop card variant intentionally has no back button before signing in
    if ((await visButton(p, "Go back").count()) !== 0) throw new Error("desktop card unexpectedly has back button");
    const errs = t.errors;
    await p.close();
    await d.close();
    return errs;
  });

  const total = failures.length;
  console.log("\n" + logs.join("\n"));
  console.log(`\nRESULT: ${total} failure${total === 1 ? "" : "s"}`);

  const allErrors = [...mErrors, ...sesErrors];
  if (allErrors.length) {
    console.log("\nCAPTURED CONSOLE ERRORS:");
    const seen = new Set();
    for (const e of allErrors) {
      if (!seen.has(e)) {
        seen.add(e);
        console.log("  " + e);
      }
    }
  }

  if (total > 0) process.exitCode = 1;

  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});