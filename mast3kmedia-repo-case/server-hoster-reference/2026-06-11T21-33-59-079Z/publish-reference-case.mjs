import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const artifactRoot = path.dirname(fileURLToPath(import.meta.url));
const portfolioRoot = path.resolve(artifactRoot, "..", "..", "..");
const screenshotDir = path.join(artifactRoot, "screenshots", "reference");
const videoDir = path.join(artifactRoot, "videos", "reference");
const productionUrl = process.env.MAST3KMEDIA_PRODUCTION_URL || "https://mast3kmedia.dk";

function readDotEnv(file) {
  try {
    return Object.fromEntries(
      fs
        .readFileSync(file, "utf8")
        .split(/\r?\n/)
        .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
        .filter(Boolean)
        .map((match) => [match[1], match[2].trim().replace(/^["']|["']$/g, "")])
    );
  } catch {
    return {};
  }
}

const dotEnv = readDotEnv(path.join(portfolioRoot, ".env"));

function dataUrl(relativePath) {
  const filePath = path.join(artifactRoot, relativePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".png"
        ? "image/png"
        : ext === ".webm"
          ? "video/webm"
          : "application/octet-stream";
  return `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

function buildPayload() {
  const dashboard = "screenshots/reference/serverhoster-01-dashboard-overview.jpg";
  const services = "screenshots/reference/serverhoster-03-service-control-plane.jpg";
  const deployments = "screenshots/reference/serverhoster-04-deployment-pipeline.jpg";
  const logs = "screenshots/reference/serverhoster-05-terminal-logs.jpg";
  const ingress = "screenshots/reference/serverhoster-06-edge-ingress.jpg";
  const databases = "screenshots/reference/serverhoster-07-database-operations.jpg";
  const mobileDashboard = "screenshots/reference/serverhoster-08-mobile-dashboard.jpg";
  const mobileServices = "screenshots/reference/serverhoster-09-mobile-services.jpg";
  const video = "videos/reference/serverhoster-authenticated-control-plane-polished.webm";

  return {
    title: "Server Hoster (LocalSURV)",
    slug: "server-hoster",
    category: "DevTools",
    description:
      "Server Hoster (LocalSURV) er et self-hosted PaaS-kontrolpanel til egne maskiner med GitHub deploys, live build logs, reverse proxy, Cloudflare Tunnel, managed databases, health checks og MCP-adgang.",
    long_description:
      "Server Hoster-casen bygger på LocalSURV-repoet: en single-machine deploy-platform, der giver en Mac mini, Linux-boks eller Windows-maskine et browserbaseret kontrolpanel til egne services. Dashboardet samler GitHub-deploys, buildhistorik, live logs, service health, domain routing, secrets og databasekoblinger i én lokal control plane.\n\nDet vigtige ved casen er ikke kun en pæn frontend, men at operatørflowet er samlet fra ende til ende: et projekt kan kobles til GitHub, bygges, startes som process/static/Docker-service, routes ud via host-baseret proxy eller Cloudflare Tunnel og overvåges med WebSocket logs, metrics, notifikationer og audit trail. Reference-mediet er derfor optaget fra en bootet, autentificeret LocalSURV-dashboardoplevelse med realistisk driftsdata, så casen viser de faktiske produktflader frem for kun en landing page.",
    challenge:
      "Egen hosting bliver hurtigt fragmenteret: Git pulls, builds, processer, Docker-containere, SSL, reverse proxy, secrets, logs, databaser og health checks ender ofte i separate terminalkommandoer. Målet var at samle de operationelle beslutninger i et dashboard, hvor en udvikler kan forstå status, deploye nyt kodegrundlag og fejlfinde uden at miste kontrol over egen infrastruktur.",
    approach:
      "Løsningen kombinerer et React/Vite-dashboard med et Fastify API og SQLite som lokal state. Repoet viser routes til projekter, services, deployments, proxy, Cloudflare, tunneller, databaser, observability, terminaler, agents og MCP. Runtime-laget understøtter proces- og static-services, Docker-services, auto-restart, healthchecks, GitHub webhooks/polling, rollback/redeploy, encrypted secrets, audit logs og WebSocket-baseret logstreaming. Casens media viser de centrale arbejdsgange: driftsoverblik, service control plane, GitOps pipeline, terminal logs, edge ingress og databasekoblinger.",
    tags: [
      "DevTools",
      "Self-hosting",
      "PaaS",
      "GitHub Deploy",
      "Reverse Proxy",
      "Cloudflare Tunnel",
      "Live Logs",
      "Databases",
      "MCP",
      "Dashboard"
    ],
    tech_stack: [
      "TypeScript",
      "React",
      "Vite",
      "Fastify",
      "SQLite",
      "better-sqlite3",
      "Dockerode",
      "Cloudflare Tunnel",
      "GitHub Webhooks",
      "WebSocket",
      "MCP SDK",
      "Zod",
      "Framer Motion",
      "Lucide React"
    ],
    client: "Server Hoster",
    year: 2026,
    status: "published",
    featured: true,
    sort_order: -10,
    metrics: [
      { value: "20", label: "API-routefiler i kontrolplanet" },
      { value: "11", label: "dashboard-sider i webappen" },
      { value: "18", label: "testfiler dokumenteret i audit" },
      { value: "5", label: "package manifests kortlagt" }
    ],
    testimonial_text: "",
    testimonial_author: "",
    testimonial_role: "",
    thumbnail_url: dataUrl(dashboard),
    case_url: "https://github.com/Flyvendedk799/ServerHoster",
    media: [
      {
        type: "image",
        url: dataUrl(dashboard),
        caption: "Driftsoverblik med live stream, health score, seneste deployments og service metrics.",
        alt: "LocalSURV dashboard med health score, deployments og service health"
      },
      {
        type: "image",
        url: dataUrl(services),
        caption:
          "Service-control plane med GitHub-status, runtime controls, managed Postgres og public domain.",
        alt: "Server Hoster service control plane med Mast3kMedia webservice og Postgres"
      },
      {
        type: "image",
        url: dataUrl(deployments),
        caption:
          "GitOps deployment pipeline med manual trigger, revisionshistorik, success states, failed build og retry.",
        alt: "Server Hoster deployment pipeline med historiske deployments"
      },
      {
        type: "image",
        url: dataUrl(logs),
        caption: "Terminal Pro med live logstreaming, level-filter, søgning, eksport og servicekontekst.",
        alt: "Server Hoster Terminal Pro live logs for portfolio API"
      },
      {
        type: "image",
        url: dataUrl(ingress),
        caption: "Edge ingress med host-baserede routes fra offentlige domæner til lokale services.",
        alt: "Server Hoster edge routing med mast3kmedia.dk og api.mast3kmedia.dk"
      },
      {
        type: "image",
        url: dataUrl(databases),
        caption: "Database-overblik med managed Postgres/Redis, backups, størrelser og service links.",
        alt: "Server Hoster database operationer med Postgres og Redis"
      },
      {
        type: "image",
        url: dataUrl(mobileDashboard),
        caption: "Smal mobil dashboardvisning med health score, service metrics og komprimeret navigation.",
        alt: "Server Hoster mobil dashboardvisning i smal viewport"
      },
      {
        type: "image",
        url: dataUrl(mobileServices),
        caption: "Smal mobil services-visning med GitHub deploy, import stack og platform presets.",
        alt: "Server Hoster mobil services-visning i smal viewport"
      },
      {
        type: "video",
        url: dataUrl(video),
        caption:
          "Guidet referenceflow gennem dashboard, services, deploy pipeline, logs, edge ingress og databases.",
        alt: "Server Hoster guidet kontrolpanelvideo"
      }
    ]
  };
}

async function updateLocalMcp(payload) {
  const client = new Client({ name: "server-hoster-reference-publisher", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["mcp-server.mjs"],
    cwd: portfolioRoot
  });
  await client.connect(transport);
  try {
    await client.callTool({ name: "update_project", arguments: { ref: "server-hoster", ...payload } });
  } finally {
    await client.close();
  }
}

async function updateProduction(payload) {
  const username = process.env.MAST3KMEDIA_ADMIN_USER || dotEnv.ADMIN_USER || "admin";
  const password = process.env.MAST3KMEDIA_ADMIN_PASS || dotEnv.ADMIN_PASS || "abe12345";
  const login = await fetch(`${productionUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!login.ok) throw new Error(`Production login failed: HTTP ${login.status}`);
  const { token } = await login.json();
  const auth = { authorization: `Bearer ${token}` };
  const projectsRes = await fetch(`${productionUrl}/api/admin/projects`, { headers: auth });
  if (!projectsRes.ok) throw new Error(`Production project list failed: HTTP ${projectsRes.status}`);
  const projects = await projectsRes.json();
  const existing = projects.find((project) => project.slug === "server-hoster");
  if (!existing) throw new Error("Production project server-hoster was not found");
  const update = await fetch(`${productionUrl}/api/admin/projects/${existing.id}`, {
    method: "PUT",
    headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!update.ok) {
    const text = await update.text();
    throw new Error(`Production update failed: HTTP ${update.status} ${text.slice(0, 500)}`);
  }
  return update.json();
}

const payload = buildPayload();
const slimPayload = {
  ...payload,
  thumbnail_url: `[data-url ${payload.thumbnail_url.length} chars]`,
  media: payload.media.map((item) => ({ ...item, url: `[data-url ${item.url.length} chars]` }))
};

fs.writeFileSync(
  path.join(artifactRoot, "server-hoster-reference-payload.slim.json"),
  `${JSON.stringify(slimPayload, null, 2)}\n`
);

await updateLocalMcp(payload);
const productionProject = await updateProduction(payload);

fs.writeFileSync(
  path.join(artifactRoot, "server-hoster-reference-publish-result.json"),
  `${JSON.stringify(
    {
      localMcp: "updated",
      production: {
        id: productionProject.id,
        slug: productionProject.slug,
        title: productionProject.title,
        status: productionProject.status,
        featured: productionProject.featured,
        mediaCount: productionProject.media?.length ?? 0
      },
      slimPayloadPath: path.join(artifactRoot, "server-hoster-reference-payload.slim.json"),
      screenshots: fs.readdirSync(screenshotDir).filter((file) => file.endsWith(".jpg")).sort(),
      videos: fs.readdirSync(videoDir).filter((file) => file.endsWith(".webm")).sort()
    },
    null,
    2
  )}\n`
);

console.log(
  JSON.stringify(
    {
      localMcp: "updated",
      production: {
        slug: productionProject.slug,
        title: productionProject.title,
        status: productionProject.status,
        featured: productionProject.featured,
        mediaCount: productionProject.media?.length ?? 0
      }
    },
    null,
    2
  )
);
