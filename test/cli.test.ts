import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:net";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { repo } from "./fixture.ts";

const CLI = join(import.meta.dirname, "../src/cli.ts");

function docs(...args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", env: { ...process.env, PORT: "" } });
}

const running: ChildProcess[] = [];
const blockers: Server[] = [];

afterEach(async () => {
  for (const child of running.splice(0)) child.kill();
  await Promise.all(blockers.splice(0).map((server) => new Promise((done) => server.close(done))));
});

function dev(root: string, port: number): Promise<string> {
  const child = spawn(process.execPath, [CLI, "dev", "--root", root, "--port", String(port)], { stdio: ["ignore", "pipe", "pipe"] });
  running.push(child);
  return new Promise((resolve, reject) => {
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      const url = /at (http:\/\/\S+)/.exec(output)?.[1];
      if (url) resolve(url);
    });
    child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.on("exit", (code) => reject(new Error(`docs dev exited with ${code}: ${output}`)));
  });
}

function block(port: number): Promise<void> {
  const server = createServer();
  blockers.push(server);
  return new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
}

describe("docs CLI", () => {
  it("lint exits 0 on a clean repo and 1 with the findings on a broken repo", () => {
    expect(docs("lint", "--root", repo()).status).toBe(0);
    const broken = docs("lint", "--root", repo({ "docs/guides/cupping.md": "# Taste\n\n[gone](gone.md)\n" }));
    expect(broken.status).toBe(1);
    expect(broken.stdout).toContain("docs/guides/cupping.md:3 links ");
  });

  it("build writes the HTML pages and the client assets", () => {
    const root = repo();
    const out = join(root, "site-out");
    const result = docs("build", "--root", root, "--out", out);
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(out, "guides/roasting/index.html"), "utf8")).toContain("<h1 id=\"roast-a-batch\">Roast a batch</h1>");
    expect(existsSync(join(out, "research/index.html"))).toBe(true);
    expect(existsSync(join(out, "agents"))).toBe(false);
    expect(existsSync(join(out, "assets/client.js")) && existsSync(join(out, "assets/client.css"))).toBe(true);
  });

  it("build exits 1 and writes nothing when lint has errors", () => {
    const root = repo({ "GLOSSARY.md": null });
    expect(docs("build", "--root", root, "--out", join(root, "site-out")).status).toBe(1);
    expect(existsSync(join(root, "site-out"))).toBe(false);
  });

  it("dev serves the site on 127.0.0.1", async () => {
    const url = await dev(repo(), 47311);
    expect(url).toBe("http://127.0.0.1:47311/");
    const response = await fetch(url);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Roastery docs");
    expect(html).toContain("/@vite/client");
  });

  it("dev picks the next free port when the first one is taken", async () => {
    await block(47321);
    const url = await dev(repo(), 47321);
    expect(url).not.toBe("http://127.0.0.1:47321/");
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
    expect((await fetch(url)).status).toBe(200);
  });
});
