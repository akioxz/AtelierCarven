import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { createQaSandbox } from "./qa-sandbox.mjs";

const displayFamily = readFileSync(new URL("../src/constants/design.ts", import.meta.url), "utf8").match(/display:\s*"([^"]+)"/)?.[1];
if (!displayFamily) throw new Error("Theme display font could not be resolved");
const sandbox = await createQaSandbox();
const BASE = sandbox.base;

let failures = 0;
const expect = (label, cond) => {
  if (cond) console.log(`ok   ${label}`);
  else { failures++; console.log(`FAIL ${label}`); }
};

let browser;

try {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const { email, password } = sandbox;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // Fail closed if the app was accidentally built with a remote backend.
  await ctx.route("**/*", async route => {
    if (!sandbox.allowRequest(route.request().url())) { await route.abort("blockedbyclient"); return; }
    await route.continue();
  });
  await ctx.addInitScript(() => {
    window.__leaf = (t) => {
      const n = [...document.querySelectorAll("div,span")].filter((x) => (x.textContent || "").trim() === t && x.children.length === 0);
      return n[0] || null;
    };
  });
  const p = await ctx.newPage();

  // Onboarding (world tokens on the entry surface)
  await p.goto(BASE, { waitUntil: "domcontentloaded" });
  await p.getByText(/A considered home begins/i).first().waitFor({ state: "visible", timeout: 15000 });
  const ob = await p.evaluate(() => {
    const canvasBlock = [...document.querySelectorAll("div")].find((el) => {
      const s = getComputedStyle(el);
      return s.backgroundColor === "rgb(233, 227, 214)" && s.display !== "none" && parseFloat(s.width || "0") > 200 && parseFloat(s.height || "0") > 100;
    });
    const established = window.__leaf("EST. 2026 · CURATED FOR HOME");
    const rule = [...document.querySelectorAll("div")].find((d) => Math.round(d.offsetWidth) === 46 && Math.round(parseFloat(getComputedStyle(d).height)) === 1 && getComputedStyle(d).backgroundColor !== "rgba(0, 0, 0, 0)");
    return {
      canvas: canvasBlock ? getComputedStyle(canvasBlock).backgroundColor : null,
      establishedFont: established ? getComputedStyle(established).fontFamily : null,
      establishedLetterSpacing: established ? getComputedStyle(established).letterSpacing : null,
      ruleBg: rule ? getComputedStyle(rule).backgroundColor : null,
    };
  });
  expect("onboarding canvas block #E9E3D6", ob.canvas === "rgb(233, 227, 214)");
  expect("brand rule accent #B5501E @ 46px", ob.ruleBg === "rgb(181, 80, 30)");
  expect("EST. 2026 overline is IBM Plex Mono", !!(ob.establishedFont || "").toLowerCase().match(/plex ?mono/));
  expect("EST. 2026 overline letter-spaced", parseFloat(ob.establishedLetterSpacing) >= 1);

  // The local fixture creates a confirmed disposable account; never sign up remotely.
  await p.getByText("Sign in", { exact: true }).first().click();
  await p.waitForURL(/\/login$/, { timeout: 25000 });
  await p.locator('input[placeholder="your@email.com"]:visible').fill(email);
  await p.locator('input[placeholder="Min. 8 characters"]:visible').fill(password);
  await p.getByRole("button", { name: "Sign in", exact: true }).click();
  await p.waitForURL(/\/home$/, { timeout: 25000 });
  await p.waitForTimeout(1800);

  const home = await p.evaluate(() => {
    const canvasBlock = [...document.querySelectorAll("div")].find((el) => {
      const s = getComputedStyle(el);
      return s.backgroundColor === "rgb(233, 227, 214)" && s.display !== "none" && parseFloat(s.width || "0") > 200 && parseFloat(s.height || "0") > 100;
    });
    const addBtn = document.querySelector('[aria-label^="Add "]');
    const searchBtn = document.querySelector('[role="button"][aria-label="Search the collection"]');
    const ledgerSub = window.__leaf("pieces in the ledger");
    const title = window.__leaf("Pieces with presence, chosen for everyday living.");
    return {
      canvas: canvasBlock ? getComputedStyle(canvasBlock).backgroundColor : null,
      addRadius: addBtn ? getComputedStyle(addBtn).borderRadius : null,
      addBg: addBtn ? getComputedStyle(addBtn).backgroundColor : null,
      searchRadius: searchBtn ? getComputedStyle(searchBtn).borderRadius : null,
      searchBg: searchBtn ? getComputedStyle(searchBtn).backgroundColor : null,
      ledgerValue: ledgerSub ? ledgerSub.previousElementSibling?.textContent : null,
      ledgerFont: ledgerSub ? getComputedStyle(ledgerSub).fontFamily : null,
      titleFont: title ? getComputedStyle(title).fontFamily : null,
    };
  });
  expect("home screen canvas", home.canvas === "rgb(233, 227, 214)");
  expect("add-to-cart square radius 4px", home.addRadius === "4px");
  expect("add-to-cart ink bg", home.addBg === "rgb(29, 27, 23)");
  expect("search bar surface bg", home.searchBg === "rgb(245, 240, 228)");
  expect("ledger count callout is a number", /^\d+$/.test(String(home.ledgerValue || "").trim()));
  expect("ledger sub is IBM Plex Mono", !!(home.ledgerFont || "").toLowerCase().match(/plex ?mono/));
  expect("hero title uses configured display family", (home.titleFont || "").replace(/[^a-z0-9]/gi, "").toLowerCase().includes(displayFamily.split("_")[0].toLowerCase()));

  // Exercise only the furniture created by this run.
  await p.goto(`${BASE}/product?id=${sandbox.productId}`, { waitUntil: "domcontentloaded" });
  await p.getByText(/ATELIER №/).first().waitFor({ state: "visible", timeout: 15000 });
  const prod = await p.evaluate(() => {
    const serialNode = [...document.querySelectorAll("div,span")].find((n) => /^ATELIER № /.test((n.textContent || "").trim()) && n.children.length === 0);
    const serial = serialNode ? window.__leaf(serialNode.textContent.trim()) : null;
    const specRow = [...document.querySelectorAll("div")].find((d) => /SIZE GUIDE|WRITE A REVIEW/.test(d.textContent));
    return {
      serialFont: serial ? getComputedStyle(serial).fontFamily : null,
      serialLetterSpacing: serial ? getComputedStyle(serial).letterSpacing : null,
      hasSerial: !!serialNode,
      hasBuyNow: !!document.body.innerText.match(/BUY NOW/),
      priceText: serialNode ? null : (specRow ? specRow.textContent.slice(0, 120) : null),
      bodyHead: document.body.innerText.slice(150, 900),
    };
  });
  expect("product serial ATELIER № present", prod.hasSerial);
  expect("product serial ATELIER № mono", !!(prod.serialFont || "").toLowerCase().match(/plex ?mono/));
  expect("product serial letter-spaced", parseFloat(prod.serialLetterSpacing) >= 1);
  expect("product BUY NOW present", prod.hasBuyNow);
  if (!prod.hasSerial || !prod.hasBuyNow) console.log("PRODUCT DEBUG:", JSON.stringify({ serialFont: prod.serialFont, bodyHead: prod.bodyHead }, null, 2).slice(0, 900));

  // checkout surface sanity (buy now -> sheet -> checkout)
  await p.locator('a[href*="/product"], [role="button"]').filter({ hasText: /BUY NOW/ }).first().click().catch(() => {});
  await p.waitForTimeout(1200);
  await p.getByText("Ready to add", { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
  await p.locator('[role="button"]:visible').filter({ hasText: "CONTINUE TO CHECKOUT" }).first().click();
  await p.waitForURL(/\/checkout$/, { timeout: 25000 });
  await p.waitForTimeout(2000);
  const ck = await p.evaluate(() => {
    const totalLabel = window.__leaf("Total");
    const row = totalLabel && totalLabel.parentElement;
    const totalNode = row
      ? [...row.querySelectorAll("div,span")].filter((n) => /^₱/.test((n.textContent || "").trim()) && n.children.length === 0)[0]
      : null;
    return {
      totalFont: totalNode ? getComputedStyle(totalNode).fontFamily : null,
      hasPaymentCta: !!document.body.innerText.match(/CONTINUE TO PAYMENT/),
    };
  });
  expect("checkout total IBM Plex Sans display", !!(ck.totalFont || "").toLowerCase().match(/plex ?sans/));
  expect("checkout CONTINUE TO PAYMENT present", ck.hasPaymentCta);
  if (!ck.hasPaymentCta) console.log("CHECKOUT DEBUG:", JSON.stringify(ck, null, 2).slice(0, 1200));

  // Fill delivery fields by index (proven approach)
  const vals = ["Style QA", "09171234567", "123 Test Street", "Makati"];
  let fillIdx = 0;
  {
    const inputs = p.locator('input:visible');
    const n = await inputs.count();
    for (let i = 0; i < n; i++) {
      const ph = await inputs.nth(i).getAttribute("placeholder");
      if (ph) await inputs.nth(i).fill(vals[fillIdx++] ?? "");
    }
  }
  await p.waitForTimeout(600);

  await p.locator('[role="button"]:visible').filter({ hasText: "CONTINUE TO PAYMENT" }).first().click();
  await p.waitForURL((u) => u.pathname.endsWith("/checkout-payment"), { timeout: 15000 });
  await p.waitForTimeout(1200);
  const pay = await p.evaluate(() => ({
    hasCodMethod: !!document.body.innerText.match(/Cash on delivery/),
    hasContinueToReview: !!document.body.innerText.match(/CONTINUE TO REVIEW/),
  }));
  expect("payment step shows COD method", pay.hasCodMethod);
  expect("payment step CONTINUE TO REVIEW present", pay.hasContinueToReview);

  await p.locator('[role="button"]:visible').filter({ hasText: "CONTINUE TO REVIEW" }).first().click();
  await p.waitForURL((u) => u.pathname.endsWith("/checkout-review"), { timeout: 15000 });
  await p.waitForTimeout(1200);
  const rev = await p.evaluate(() => ({
    hasConfirmOrder: !!document.body.innerText.match(/CONFIRM ORDER/),
    hasMethodLabel: !!document.body.innerText.match(/METHOD/),
  }));
  expect("review step CONFIRM ORDER present", rev.hasConfirmOrder);

  await p.locator('[role="button"]:visible').filter({ hasText: "CONFIRM ORDER" }).first().click();
  await p.waitForURL((u) => u.pathname.endsWith("/order-success"), { timeout: 25000 });
  await p.waitForTimeout(1500);
  const os = await p.evaluate(() => {
    const stamp = window.__leaf("DISPATCH STAMP · THE CRATE GOES OUT");
    const title = window.__leaf("Order Placed!");
    return {
      hasTitle: !!title,
      stampFont: stamp ? getComputedStyle(stamp).fontFamily : null,
    };
  });
  expect("order success title", os.hasTitle);
  expect("order success dispatch stamp mono", !!(os.stampFont || "").toLowerCase().match(/plex ?mono/));

  console.log(failures === 0 ? "\nALL STYLE CHECKS PASS" : `\n${failures} FAILURES`);
  process.exitCode = failures === 0 ? 0 : 1;
} finally {
  try { await browser?.close(); }
  finally { await sandbox.cleanup(); }
}