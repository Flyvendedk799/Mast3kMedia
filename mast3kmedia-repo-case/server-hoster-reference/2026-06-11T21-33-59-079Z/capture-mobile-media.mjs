import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const artifactRoot = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.join(artifactRoot, "work", "repo");
const dataDir = path.join(artifactRoot, "work", "reference-data");
const outputDir = path.join(artifactRoot, "screenshots", "reference");
const logsDir = path.join(artifactRoot, "logs");
const authToken = `mobile-reference-${crypto.randomBytes(18).toString("hex")}`;
const secretKey = crypto.randomBytes(32).toString("base64");
const captureCss = `
  [data-tooltip]::before,
  [data-tooltip]::after {
    content: none !important;
    display: none !important;
  }
  * { caret-color: transparent !important; }
`;

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(logsDir, { recursive: true });

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function waitForHttp(url, timeoutMs = 45000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          resolve();
          return;
        }
      } catch {
        // keep polling
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(tick, 500);
    };
    tick();
  });
}

function spawnLogged(name, command, args, env) {
  const out = fs.createWriteStream(path.join(logsDir, `${name}.log`), { flags: "a" });
  const child = spawn(command, args, {
    cwd: repoDir,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.pipe(out);
  child.stderr.pipe(out);
  return child;
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
      resolve();
    }, 2500);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function isoMinutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

async function installReferenceRoutes(context, apiBase) {
  await context.route("**/metrics/system", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        uptime: 384923,
        totalMemory: 34_359_738_368,
        freeMemory: 18_253_611_008,
        loadAvg: [0.72, 0.64, 0.58],
        cpus: 10,
        platform: "darwin"
      })
    });
  });
  await context.route("**/health/system", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        disk: {
          path: "/srv/survhub",
          totalBytes: 549_755_813_888,
          freeBytes: 384_829_069_312,
          usedPercent: 30
        },
        dockerOk: true,
        dockerError: null,
        memoryUsedPercent: 46,
        loadAvg1m: 0.72,
        score: 98,
        warnings: [],
        checkedAt: new Date().toISOString()
      })
    });
  });
  await context.route("**/health/docker", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ available: true, hasDockerServices: false })
    });
  });
  await context.route("**/databases", async (route) => {
    if (route.request().method() !== "GET" || route.request().url() !== `${apiBase}/databases`) {
      await route.continue();
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "db-portfolio",
          project_id: "proj-production",
          name: "portfolio-postgres",
          engine: "postgres",
          port: 54329,
          container_id: "survhub-db-portfolio",
          connection_string: "postgresql://survhub:••••••@localhost:54329/mast3kmedia",
          username: "survhub",
          password: "reference",
          database_name: "mast3kmedia",
          created_at: isoMinutesAgo(1390),
          container_status: { state: "running", health: "healthy", startedAt: isoMinutesAgo(41) },
          stats: { size_bytes: 94_371_284, last_backup_at: isoMinutesAgo(46) }
        },
        {
          id: "db-cache",
          project_id: "proj-ops",
          name: "capture-redis",
          engine: "redis",
          port: 63791,
          container_id: "survhub-db-cache",
          connection_string: "redis://localhost:63791",
          username: "",
          password: "",
          database_name: "",
          created_at: isoMinutesAgo(840),
          container_status: { state: "running", health: null, startedAt: isoMinutesAgo(18) },
          stats: { size_bytes: 18_423_001, last_backup_at: isoMinutesAgo(121) }
        }
      ])
    });
  });
  await context.route("**/services/github-sync-statuses", async (route) => {
    const body = route.request().postDataJSON?.() ?? { serviceIds: [] };
    const items = (body.serviceIds ?? []).map((serviceId) => ({
      serviceId,
      branch: serviceId === "svc-preview" ? "reference-case" : "main",
      autoPull: serviceId !== "svc-preview",
      latestCommitHash:
        serviceId === "svc-api" ? "b73e91d" : serviceId === "svc-worker" ? "e5a91bc" : "a18c42f",
      remoteHash:
        serviceId === "svc-api" ? "b73e91d" : serviceId === "svc-worker" ? "e5a91bc" : "a18c42f",
      updateAvailable: false,
      requiresRestart: false,
      canCheck: true,
      reason: null
    }));
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ items }) });
  });
}

async function screenshot(page, fileName) {
  await page.mouse.move(20, 20);
  await page.waitForTimeout(900);
  await page.screenshot({
    path: path.join(outputDir, fileName),
    type: "jpeg",
    quality: 86,
    fullPage: false
  });
}

async function main() {
  if (!fs.existsSync(path.join(dataDir, "survhub.db"))) {
    throw new Error("Missing seeded LocalSURV database. Run capture-reference-media.mjs first.");
  }

  const apiPort = await getFreePort();
  const webPort = await getFreePort();
  const proxyPort = await getFreePort();
  const apiBase = `http://127.0.0.1:${apiPort}`;
  const webBase = `http://127.0.0.1:${webPort}`;

  let server;
  let web;
  try {
    server = spawnLogged("localsurv-mobile-server", "npm", ["run", "dev", "-w", "@survhub/server"], {
      NODE_ENV: "development",
      SURVHUB_DATA_DIR: dataDir,
      SURVHUB_AUTH_TOKEN: authToken,
      SURVHUB_SECRET_KEY: secretKey,
      SURVHUB_PORT: String(apiPort),
      SURVHUB_HOST: "127.0.0.1",
      SURVHUB_PROXY_PORT: String(proxyPort),
      SURVHUB_HEALTHCHECK_INTERVAL_MS: "600000",
      SURVHUB_GIT_POLL_INTERVAL_MS: "600000",
      SURVHUB_SESSION_TTL_MS: "43200000",
      LOCALSURV_NO_UPDATE_CHECK: "1"
    });
    await waitForHttp(`${apiBase}/health`);

    web = spawnLogged("localsurv-mobile-web", "npm", [
      "run",
      "dev",
      "-w",
      "@survhub/web",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      String(webPort),
      "--strictPort"
    ], {
      VITE_SURVHUB_API_URL: apiBase,
      VITE_SURVHUB_WS_URL: `${apiBase.replace("http", "ws")}/ws`
    });
    await waitForHttp(webBase);

    const playwrightRequire = createRequire(path.join(artifactRoot, "tools", "playwright", "package.json"));
    const { chromium } = playwrightRequire("playwright");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      deviceScaleFactor: 2
    });
    await context.addInitScript((token) => {
      localStorage.setItem("survhub_token", token);
      localStorage.setItem("survhub_theme", "dark");
      localStorage.setItem("survhub_sidebar", "collapsed");
      sessionStorage.setItem("survhub_prefer_login", "1");
    }, authToken);
    await installReferenceRoutes(context, apiBase);

    const page = await context.newPage();
    async function visit(route, selector) {
      await page.goto(`${webBase}${route}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(selector, { timeout: 20000 });
      await page.addStyleTag({ content: captureCss }).catch(() => undefined);
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
      await page.waitForTimeout(700);
    }

    await visit("/dashboard", ".dashboard-page");
    await screenshot(page, "serverhoster-08-mobile-dashboard.jpg");

    await visit("/services", ".services-page");
    await screenshot(page, "serverhoster-09-mobile-services.jpg");

    await context.close();
    await browser.close();

    const summary = {
      apiBase,
      webBase,
      screenshots: [
        path.join(outputDir, "serverhoster-08-mobile-dashboard.jpg"),
        path.join(outputDir, "serverhoster-09-mobile-services.jpg")
      ],
      logs: logsDir
    };
    fs.writeFileSync(path.join(artifactRoot, "mobile-media-summary.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await stopProcess(web);
    await stopProcess(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
