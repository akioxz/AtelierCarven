import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8721";

let failures = 0;
const expect = (label, cond) => {
  if (cond) console.log(`ok   ${label}`);
  else { failures++; console.log(`FAIL ${label}`); }
};

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const email = `style.qa.${Date.now()}@example.com`;
  const password = "CarvenQA123!";
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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

  // Sign up -> home
  await p.getByText("Sign in", { exact: true }).first().click();
  await p.waitForURL(/\/login$/, { timeout: 25000 });
  await p.locator('[role="button"]:visible').filter({ hasText: "Create an account" }).first().click();
  await p.waitForURL(/\/signup$/, { timeout: 25000 });
  await p.locator('input[placeholder="Your name"]:visible').fill("Style QA");
  await p.locator('input[placeholder="your@email.com"]:visible').fill(email);
  await p.locator('input[placeholder="Min. 8 characters"]:visible').fill(password);
  await p.locator('input[placeholder="Re-enter password"]:visible').fill(password);
  await p.locator('[role="button"]:visible').filter({ hasText: "Create account" }).first().click();
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
  expect("hero title Archivo", (home.titleFont || "").toLowerCase().includes("archivo"));

  // Product page
  for (let attempt = 0; attempt < 3; attempt++) {
    await p.locator('[aria-label^="View "]:not([aria-label="View saved furniture"]):not([aria-label="View cart"])').first().click().catch(() => {});
    try {
      await p.getByText(/ATELIER №/).first().waitFor({ state: "visible", timeout: 15000 });
      break;
    } catch {
      await p.waitForTimeout(1200);
    }
  }
  await p.waitForTimeout(1200);
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
  expect("checkout total Archivo display", (ck.totalFont || "").toLowerCase().includes("archivo"));
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
  await p.waitForTimeout(3000);
  if (!p.url().includes("/payment")) {
    const dump = await p.evaluate(() => ({ url: location.href, body: document.body.innerText.slice(0, 700) }));
    console.log("PAYMENT NAV FAIL ->", JSON.stringify(dump, null, 2));
  }
  await p.waitForURL((u) => u.pathname.endsWith("/payment"), { timeout: 15000 });
  await p.waitForTimeout(1200);
  const pay = await p.evaluate(() => ({
    hasCodSummary: !!document.body.innerText.match(/CASH ON DELIVERY/),
    hasConfirmOrder: !!document.body.innerText.match(/CONFIRM ORDER/),
  }));
  expect("payment COD summary present", pay.hasCodSummary);
  expect("payment CONFIRM ORDER present", pay.hasConfirmOrder);

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
  await browser.close();
}