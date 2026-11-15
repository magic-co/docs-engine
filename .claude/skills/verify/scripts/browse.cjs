#!/usr/bin/env node
// Runs a list of browser steps in one Playwright page. See ../SKILL.md, section Drive.
const { execSync } = require("node:child_process");
const { mkdirSync, readFileSync, writeFileSync, appendFileSync } = require("node:fs");
const { join } = require("node:path");
const { chromium } = require("playwright");

const [outDir, stepsFile] = process.argv.slice(2);
const base = process.env.DOCS_VERIFY_URL;
if (!outDir || !stepsFile || !base) {
  console.error("usage: DOCS_VERIFY_URL=<url> browse.cjs <evidence dir> <steps.json | ->");
  process.exit(2);
}
const steps = JSON.parse(readFileSync(stepsFile === "-" ? 0 : stepsFile, "utf8"));
mkdirSync(outDir, { recursive: true });
const log = join(outDir, "steps.log");
writeFileSync(join(outDir, "steps.json"), JSON.stringify(steps, null, 2));
writeFileSync(log, `base: ${base}\n`);
const note = (line) => {
  appendFileSync(log, `${line}\n`);
  console.log(line);
};

function locate(page, target) {
  if (typeof target === "string") target = { text: target };
  let loc;
  if (target.node) loc = page.locator("docs-flow-node a").filter({ hasText: new RegExp(`^${escape(target.node)}$`) });
  else if (target.role) loc = page.getByRole(target.role, { name: target.name, exact: true });
  else if (target.text) loc = page.getByText(target.text, { exact: true });
  else if (target.css) loc = page.locator(target.css);
  else throw new Error(`unknown target ${JSON.stringify(target)}`);
  if (target.hasText) loc = loc.filter({ hasText: target.hasText });
  if (target.nth !== undefined) loc = loc.nth(target.nth);
  return loc;
}

function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function run(page, step) {
  const [kind, arg] = Object.entries(step).find(([key]) => key !== "timeout");
  const timeout = step.timeout ?? 5000;
  switch (kind) {
    case "goto": {
      const response = await page.goto(new URL(arg, base).href);
      return `status ${response?.status()} at ${page.url()}`;
    }
    case "hover": await locate(page, arg).hover({ timeout }); return "";
    case "focus": await locate(page, arg).focus({ timeout }); return "";
    case "click": await locate(page, arg).click({ timeout }); return `now at ${page.url()}`;
    case "press": await page.keyboard.press(arg); return "";
    case "expectVisible": await locate(page, arg).waitFor({ state: "visible", timeout }); return "visible";
    case "expectHidden": await locate(page, arg).waitFor({ state: "hidden", timeout }); return "hidden";
    case "expectFocused": {
      const loc = locate(page, arg);
      await page.waitForFunction((el) => el === document.activeElement, await loc.elementHandle({ timeout }), { timeout });
      return "focused";
    }
    case "expectUrl": await page.waitForURL(new RegExp(arg), { timeout }); return page.url();
    case "expectCount": {
      const loc = locate(page, arg.target);
      const deadline = Date.now() + timeout;
      while ((await loc.count()) !== arg.count && Date.now() < deadline) await page.waitForTimeout(100);
      const count = await loc.count();
      if (count !== arg.count) throw new Error(`expected ${arg.count} matches, found ${count}`);
      return `${count} matches`;
    }
    case "eval": return String(await page.evaluate(arg));
    case "expectEval": await page.waitForFunction(arg, undefined, { timeout }); return "true";
    case "run": {
      const out = execSync(arg, { env: process.env, encoding: "utf8", shell: "/bin/bash" });
      return out.trim().split("\n").slice(-5).join(" | ");
    }
    case "wait": await page.waitForTimeout(arg); return "";
    case "aria": {
      const snapshot = await page.locator("body").ariaSnapshot();
      writeFileSync(join(outDir, `${arg}.aria.yaml`), snapshot);
      return `${arg}.aria.yaml`;
    }
    case "screenshot": await page.screenshot({ path: join(outDir, `${arg}.png`), fullPage: true }); return `${arg}.png`;
    case "text": {
      const text = await locate(page, arg.target).innerText({ timeout });
      writeFileSync(join(outDir, `${arg.save}.txt`), text);
      return `${arg.save}.txt`;
    }
    default: throw new Error(`unknown step "${kind}"`);
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  let failed = false;
  for (const [index, step] of steps.entries()) {
    try {
      const result = await run(page, step);
      note(`ok    ${index + 1} ${JSON.stringify(step)}${result ? ` -> ${result}` : ""}`);
    } catch (error) {
      failed = true;
      note(`FAIL  ${index + 1} ${JSON.stringify(step)} -> ${error.message.split("\n")[0]}`);
      await page.screenshot({ path: join(outDir, "failure.png"), fullPage: true }).catch(() => {});
      writeFileSync(join(outDir, "failure.aria.yaml"), await page.locator("body").ariaSnapshot().catch(() => ""));
      break;
    }
  }
  if (errors.length > 0) note(`browser errors: ${errors.join(" | ")}`);
  await browser.close();
  note(failed ? `result: FAIL, evidence in ${outDir}` : `result: ok, evidence in ${outDir}`);
  process.exit(failed ? 1 : 0);
})();
