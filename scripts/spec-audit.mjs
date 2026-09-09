import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO = "C:\\Users\\User\\Documents\\Personal Projects\\AtelierCarven";
const BASE = process.env.BASE_URL || "http://localhost:8721";
const REV = join(REPO, ".impeccable", "review");
const staticHtml = (name) => {
  try { return readFileSync(join(REPO, "dist", name), "utf8"); } catch { return ""; }
};

const results = [];
const expect = (id, label, cond, measured = "") => {
  results.push({ id, label, measured, ok: !!cond });
  console.log(`${cond ? "ok   " : "FAIL "} ${id} ${label}${measured ? `  [${measured}]` : ""}`);
};

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const email = `spec.qa.${Date.now()}@example.com`;
  const password = "CarvenQA123!";

  const vis = (p, label) => p.locator(`[role="button"]:visible`).filter({ hasText: label }).first();
  const waitURL = (p, re) => p.waitForURL(re, { timeout: 25000 });

  const dbnd = "—"; // standalone fallback placeholder
  const hasDecorative = (text) => /[A-Za-z0-9)\]]\u2014[A-Za-z0-9([]/.test(text) || /\u2015/.test(text);

  // ---------------------------------------------------------------- desktop
  const dctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const d = await dctx.newPage();

  // Onboarding
  await d.goto(BASE, { waitUntil: "domcontentloaded" });
  const splash = await d.evaluate(() => new Promise((resolve) => {
    let old = 0, neu = 0, done = false;
    const finish = () => { if (!done) { done = true; resolve({ old, neu }); } };
    const tick = () => {
      const t = document.body ? document.body.innerText : "";
      if (/LUXURY · CRAFTED · TIMELESS/.test(t)) old++;
      if (/ATELIER CARVÉN · EST\. 2026/.test(t)) neu++;
    };
    tick();
    const iv = setInterval(() => { tick(); if (old || neu) finish(); }, 80);
    setTimeout(() => { clearInterval(iv); finish(); }, 2000);
  }));
  await d.getByText(/A considered home begins/i).first().waitFor({ state: "visible", timeout: 15000 });
  const ob = await d.evaluate(() => {
    const txt = document.body.innerText;
    const leafMatch = (t) => [...document.querySelectorAll("div,span")].find((n) => n.children.length === 0 && (n.textContent || "").trim() === t);
    const canvasBlock = [...document.querySelectorAll("div")].find((el) => {
      const s = getComputedStyle(el);
      return s.backgroundColor === "rgb(233, 227, 214)" && s.display !== "none" && parseFloat(s.width || "0") > 200;
    });
    const bottom = [...document.querySelectorAll("div,span")].filter((n) => n.children.length === 0 && /EST. 2026/.test((n.textContent || "").trim()));
    const btnRadii = [...document.querySelectorAll('[role="button"]')].map((b) => getComputedStyle(b).borderRadius);
    const decorative = txt.match(/[A-Za-z0-9)\]]\u2014[A-Za-z0-9([]/g) || [];
    return {
      canvas: canvasBlock ? getComputedStyle(canvasBlock).backgroundColor : null,
      priorFont: bottom[0] ? getComputedStyle(bottom[0]).fontFamily : null,
      priorSpacing: bottom[0] ? getComputedStyle(bottom[0]).letterSpacing : null,
      decorative,
      pillRadii: btnRadii.filter((r) => r.endsWith("px") && parseFloat(r) >= 20),
    };
  });
  const splashStatic = staticHtml("index.html") + "\n" + staticHtml("splash.html");
  expect("OB1", "splash strip rebranded (static HTML + old gone in DOM)", (/ATELIER CARV.{0,16}EST\. 2026/.test(splashStatic) || splash.neu > 0) && !/LUXURY/.test(splashStatic) && splash.old === 0, `new=${splash.neu} old=${splash.old}`);
  expect("OB2", "canvas #E9E3D6", ob.canvas === "rgb(233, 227, 214)", ob.canvas);
  expect("OB3", "EST. 2026 overline mono + letter-spaced", !!(ob.priorFont || "").toLowerCase().match(/plex ?mono/) && parseFloat(ob.priorSpacing) >= 1, ob.priorFont);
  expect("OB4", "no decorative em-dash in visible text", ob.decorative.length === 0, `${ob.decorative.length} found`);
  expect("OB5", "no pill buttons (radius >= 20)", ob.pillRadii.length === 0, ob.pillRadii.join(",") || "none");

  // Sign up -> home
  await d.getByText("Sign in", { exact: true }).first().click();
  await waitURL(d, /\/login$/);
  await vis(d, "Create an account").click();
  await waitURL(d, /\/signup$/);
  await d.locator('input[placeholder="Your name"]:visible').fill("Spec Audit");
  await d.locator('input[placeholder="your@email.com"]:visible').fill(email);
  await d.locator('input[placeholder="Min. 8 characters"]:visible').fill(password);
  await d.locator('input[placeholder="Re-enter password"]:visible').fill(password);
  await vis(d, "Create account").click();
  await waitURL(d, /\/home$/);
  await d.waitForTimeout(1500);
  // wait until ledger count is a number (not the dash fallback)
  await d.waitForFunction(() => {
    const sub = [...document.querySelectorAll("div,span")].find((n) => n.children.length === 0 && (n.textContent || "").trim() === "pieces in the ledger");
    return sub && sub.previousElementSibling && /^\d+$/.test(sub.previousElementSibling.textContent.trim());
  }, { timeout: 20000 }).catch(() => {});

  const home = await d.evaluate(() => {
    const heroCopy = [...document.querySelectorAll("div")].find((el) => {
      const t = el.textContent || "";
      return t.includes("Welcome back") && t.includes("Pieces with presence") && t.includes("Discover the latest furniture") && el.children.length <= 8 && !t.includes("pieces in the ledger");
    });
    const frame1400 = [...document.querySelectorAll("div")].filter((el) => Math.round(el.getBoundingClientRect().width) === 1400);
    const leafMatch = (t) => [...document.querySelectorAll("div,span")].find((n) => n.children.length === 0 && (n.textContent || "").trim() === t);
    const ledgerSub = leafMatch("pieces in the ledger");
    const searchBtns = [...document.querySelectorAll('[aria-label="Search the collection"]')];
    const heading = leafMatch("Handpicked for you");
    const overline = heading ? heading.previousElementSibling : null;
    const leading = heroCopy && heroCopy.firstElementChild ? heroCopy.firstElementChild.textContent.trim().slice(0, 40) : null;
    const allLeaf = [...document.querySelectorAll("div,span")].filter((n) => n.children.length === 0 && (n.textContent || "").trim());
    const numberedEyebrows = allLeaf.filter((n) => {
      const s = getComputedStyle(n);
      const t = (n.textContent || "").trim();
      return parseFloat(s.fontSize) <= 11 && /^(N°\s?\d{2}|No\.\s?\d{2}|\d{2})$/.test(t);
    }).map((n) => n.textContent.trim());
    const decorative = document.body.innerText.match(/[A-Za-z0-9)\]]\u2014[A-Za-z0-9([]/g) || [];
    const falls = (document.body.innerText.match(/\u2014/g) || []).length - decorative.length;
    const pillRadii = [...document.querySelectorAll('[role="button"]')].map((b) => getComputedStyle(b).borderRadius).filter((r) => r.endsWith("px") && parseFloat(r) >= 20);
    return {
      heroChildren: heroCopy ? heroCopy.children.length : -1,
      heroLeading: leading,
      hasGreeting: !!leafMatch("Welcome back, Spec Audit."),
      hasTitle: !!leafMatch("Pieces with presence, chosen for everyday living."),
      hasSubtitle: !!leafMatch("Discover the latest furniture in the Atelier Carvén collection."),
      frames1400: frame1400.filter((el) => Math.round(el.getBoundingClientRect().x) === 260).length,
      framesAny: frame1400.length,
      ledgerVal: ledgerSub ? ledgerSub.previousElementSibling?.textContent.trim() : null,
      ledgerFont: ledgerSub ? getComputedStyle(ledgerSub).fontFamily : null,
      canvas: [...document.querySelectorAll("div")].find((el) => {
        const s = getComputedStyle(el);
        return s.backgroundColor === "rgb(233, 227, 214)" && parseFloat(el.getBoundingClientRect().width) > 300;
      }) ? "rgb(233,227,214)" : null,
      searchRadius: searchBtns[0] ? getComputedStyle(searchBtns[0]).borderRadius : null,
      hasNNumbered: /(N°\s?\d|No\.\s?\d)/.test(document.body.innerText),
      numberedEyebrows,
      decorative,
      falls,
      pillRadii,
    };
  });
  expect("HM1", "hero = 4 elements (greet/title/subtitle/actions)", home.heroChildren === 4, `${home.heroChildren}`);
  expect("HM2", "hero starts with greeting (no N° overline)", home.heroLeading === "Welcome back, Spec Audit.", home.heroLeading);
  expect("HM3", "hero copy: title + subtitle present", home.hasGreeting && home.hasTitle && home.hasSubtitle);
  expect("HM4", "pageMaxWidth 1400 centered (x=260 @1920)", home.framesAny >= 1 && home.frames1400 >= 1, `${home.frames1400}/${home.framesAny}`);
  expect("HM5", "ledger shows a number, mono sub", /^\d+$/.test(String(home.ledgerVal || "")) && /plex ?mono/i.test(home.ledgerFont || ""), `${home.ledgerVal}`);
  expect("HM6", "canvas ground", home.canvas === "rgb(233,227,214)");
  expect("HM7", "search bar within ledger radius (card <= 10, not pill)", !!(home.searchRadius && parseFloat(home.searchRadius) <= 10), home.searchRadius);
  expect("HM8", "no numbered `N°02` type eyebrow", !home.hasNNumbered && home.numberedEyebrows.length === 0, home.numberedEyebrows.join("|") || "none");
  expect("HM9", "no decorative em-dash", home.decorative.length === 0, `${home.decorative.length} decorative / ${home.falls} standalone fallback`);
  expect("HM10", "no pill buttons (radius >= 20)", home.pillRadii.length === 0, home.pillRadii.join(",") || "none");

  // Search (SectionHeading) — from home, then back
  await d.locator('[role="button"][aria-label="Search the collection"]').first().click();
  await waitURL(d, /\/search$/);
  await d.waitForTimeout(1400);
  const search = await d.evaluate(() => {
    const sec = [...document.querySelectorAll("div")].find((el) => {
      const t = (el.textContent || "").replace(/\s+/g, " ").trim();
      return t.startsWith("Search the collection") && t.includes("Browse everything") && el.children.length <= 5 && el.children.length >= 2;
    });
    const overline = sec && [...sec.querySelectorAll("div,span")].find((n) => n.children.length === 0 && (n.textContent || "").trim() === "Search the collection");
    return {
      hasSectionHeading: !!sec && !!overline,
      overlineText: overline ? overline.textContent.trim() : null,
      overlineFont: overline ? getComputedStyle(overline).fontFamily : null,
      overlineSize: overline ? getComputedStyle(overline).fontSize : null,
      overlineSpacing: overline ? getComputedStyle(overline).letterSpacing : null,
      decorative: document.body.innerText.match(/[A-Za-z0-9)\]]\u2014[A-Za-z0-9([]/g) || [],
    };
  });
  expect("SR1", "SectionHeading no numbered index", search.hasSectionHeading, search.overlineText);
  expect("SR2", "overline mono 10px uppercase letter-spaced", /plex ?mono/i.test(search.overlineFont || "") && parseFloat(search.overlineSize) <= 11 && parseFloat(search.overlineSpacing) >= 2, `${search.overlineText} @ ${search.overlineFont}`);
  expect("SR3", "no decorative em-dash", search.decorative.length === 0, `${search.decorative.length} found`);

  // Back to home, then product page
  await d.goBack();
  await d.getByText("Discover the latest furniture").first().waitFor({ state: "visible", timeout: 15000 });
  await d.waitForTimeout(600);
  for (let attempt = 0; attempt < 3; attempt++) {
    await d.locator('[aria-label^="View "]:not([aria-label="View saved furniture"]):not([aria-label="View cart"])').first().click().catch(() => {});
    try {
      await d.getByText(/ATELIER №/).first().waitFor({ state: "visible", timeout: 15000 });
      break;
    } catch {
      await d.waitForTimeout(1200);
    }
  }
  await d.waitForTimeout(1200);
  const prod = await d.evaluate(() => {
    const serialNode = [...document.querySelectorAll("div,span")].find((n) => /^ATELIER № /.test((n.textContent || "").trim()) && n.children.length === 0);
    const serial = serialNode ? [...document.querySelectorAll("div,span")].find((n) => n.children.length === 0 && (n.textContent || "").trim() === serialNode.textContent.trim()) : null;
    const addBtn = document.querySelector('[aria-label^="Add "]');
    const decorative = document.body.innerText.match(/[A-Za-z0-9)\]]\u2014[A-Za-z0-9([]/g) || [];
    const falls = (document.body.innerText.match(/\u2014/g) || []).length - decorative.length > 0 ? "(size guides)" : "none";
    return {
      hasSerial: !!serialNode,
      serialFont: serial ? getComputedStyle(serial).fontFamily : null,
      serialSpacing: serial ? getComputedStyle(serial).letterSpacing : null,
      hasBuyNow: /BUY NOW/.test(document.body.innerText),
      hasNewReviewCopy: /No reviews yet\. Be the first to share your thoughts\./.test(document.body.innerText),
      hasOldReviewCopy: /No reviews yet —/.test(document.body.innerText),
      addRadius: addBtn ? getComputedStyle(addBtn).borderRadius : null,
      decorative,
      falls,
    };
  });
  expect("PR1", "serial ATELIER № mono + letter-spaced", prod.hasSerial && /plex ?mono/i.test(prod.serialFont || "") && parseFloat(prod.serialSpacing) >= 1, prod.serialFont);
  expect("PR2", "BUY NOW present", prod.hasBuyNow);
  expect("PR3", "reviews empty-state copy de-dashed", !prod.hasOldReviewCopy, prod.hasNewReviewCopy ? "new copy" : prod.hasOldReviewCopy ? "old copy" : "n/a (reviews exist)");
  expect("PR4", "add-to-cart square radius", prod.addRadius === "4px", prod.addRadius);
  expect("PR5", "no decorative em-dash", prod.decorative.length === 0, `${prod.decorative.length} decorative / ${prod.falls}`);
  if (!prod.hasSerial || !prod.hasBuyNow) console.log("PRODUCT DEBUG:", JSON.stringify(prod).slice(0, 700));

  // Checkout
  await d.locator('a[href*="/product"], [role="button"]').filter({ hasText: /BUY NOW/ }).first().click().catch(() => {});
  await d.waitForTimeout(1200);
  await d.getByText("Ready to add", { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
  await vis(d, "CONTINUE TO CHECKOUT").click();
  await waitURL(d, /\/checkout$/);
  await d.waitForTimeout(1800);
  const ck = await d.evaluate(() => {
    const totalLeaf = [...document.querySelectorAll("div,span")].find((n) => n.children.length === 0 && (n.textContent || "").trim() === "Total");
    const totalNode = totalLeaf ? [...totalLeaf.parentElement.querySelectorAll("div,span")].find((n) => /^₱/.test((n.textContent || "").trim()) && n.children.length === 0) : null;
    return {
      hasDemoCopy: /Simulated only\. Never enter real card details\./.test(document.body.innerText),
      hasPaymentCta: /CONTINUE TO PAYMENT/.test(document.body.innerText),
      totalFont: totalNode ? getComputedStyle(totalNode).fontFamily : null,
      totalColor: totalNode ? getComputedStyle(totalNode).color : null,
      decorative: document.body.innerText.match(/[A-Za-z0-9)\]]\u2014[A-Za-z0-9([]/g) || [],
    };
  });
  expect("CK1", "de-dashed card demo copy", ck.hasDemoCopy, ck.hasDemoCopy ? "new copy" : "old copy");
  expect("CK2", "CONTINUE TO PAYMENT present", ck.hasPaymentCta);
  expect("CK3", "total in Archivo display, accent", /archivo/i.test(ck.totalFont || "") && ck.totalColor === "rgb(181, 80, 30)", ck.totalFont);
  expect("CK4", "no decorative em-dash", ck.decorative.length === 0, `${ck.decorative.length} found`);
  await d.close();

  // ---------------------------------------------------------------- mobile home
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const m = await mctx.newPage();
  await m.goto(BASE, { waitUntil: "domcontentloaded" });
  await m.getByText("Sign in", { exact: true }).first().click();
  await waitURL(m, /\/login$/);
  await m.locator('input[placeholder="your@email.com"]:visible').fill(email);
  await m.locator('input[placeholder="Min. 8 characters"]:visible').fill(password);
  await vis(m, "Sign in").click();
  await waitURL(m, /\/home$/);
  await m.waitForTimeout(2200);
  const mob = await m.evaluate(() => {
    const sw = document.scrollingElement ? document.scrollingElement.scrollWidth : 0;
    const iw = window.innerWidth;
    const title = [...document.querySelectorAll("div,span")].find((n) => n.children.length === 0 && (n.textContent || "").trim() === "Pieces with presence, chosen for everyday living.");
    return {
      noHScroll: sw <= iw,
      scrollW: sw, innerW: iw,
      hasTitle: !!title,
      titleWidth: title ? Math.round(title.getBoundingClientRect().width) : 0,
      decorative: document.body.innerText.match(/[A-Za-z0-9)\]]\u2014[A-Za-z0-9([]/g) || [],
    };
  });
  expect("MB1", "hero fits on 390 (no occluded/wide)", mob.hasTitle && mob.titleWidth > 0 && mob.titleWidth < 380, `${mob.titleWidth}px`);
  expect("MB2", "no horizontal scroll on mobile", mob.noHScroll, `${mob.scrollW} <= ${mob.innerW}`);
  expect("MB3", "no decorative em-dash", mob.decorative.length === 0, `${mob.decorative.length} found`);
  await m.close();

  // ---------------------------------------------------------------- report
  const lines = [
    "# Design Spec Audit — computed-style contract",
    "",
    `Date: 2026-09-10 · Build: \`master\` @ taste-skill pass · Viewport: 1920x1080 (desktop) / 390x844 (mobile)`,
    `Source: static web export served at \`${BASE}\`; rendered with Playwright + headless Edge.`,
    "",
    "Contract: Workshop Manifest tokens + taste-skill pass (`9d64eb1`) — 1400px page, no numbered eyebrows,",
    "no decorative em/en-dashes, hero <= 4 elements, square interactions, mono overlines/serials, brand splash.",
    "",
    "| # | check | measured | status |",
    "|---|-------|----------|--------|",
  ];
  for (const r of results) lines.push(`| ${r.id} | ${r.label} | ${r.measured || "&mdash;"} | ${r.ok ? "PASS" : "**FAIL**"} |`);
  const fails = results.filter((r) => !r.ok).length;
  lines.push("");
  lines.push(`**${results.length - fails}/${results.length} checks passed.** ${fails === 0 ? "No failures." : `${fails} failure(s).`}`);
  writeFileSync(join(REV, "SPEC-REPORT.md"), lines.join("\n"));

  console.log(`\n${results.length - fails}/${results.length} PASS · ${fails} FAIL`);
  console.log(`report: ${join(REV, "SPEC-REPORT.md")}`);
  process.exitCode = fails === 0 ? 0 : 1;
} finally {
  await browser.close();
}