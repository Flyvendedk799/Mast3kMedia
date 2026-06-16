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
const rawVideoDir = path.join(artifactRoot, "videos", "reference-raw");
const finalVideoDir = path.join(artifactRoot, "videos", "reference");
const logsDir = path.join(artifactRoot, "logs");
const captureCss = `
  [data-tooltip]::before,
  [data-tooltip]::after {
    content: none !important;
    display: none !important;
  }
  * { caret-color: transparent !important; }
`;

fs.rmSync(dataDir, { recursive: true, force: true });
for (const dir of [dataDir, outputDir, rawVideoDir, finalVideoDir, logsDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

const authToken = `reference-${crypto.randomBytes(18).toString("hex")}`;
const secretKey = crypto.randomBytes(32).toString("base64");

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

function isoMinutesAhead(minutes) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function seedReferenceData(dbPath) {
  const repoRequire = createRequire(path.join(repoDir, "package.json"));
  const Database = repoRequire("better-sqlite3");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  const projectStmt = db.prepare(`
    INSERT INTO projects (id, name, description, git_url, created_at, updated_at)
    VALUES (@id, @name, @description, @git_url, @created_at, @updated_at)
  `);
  const serviceStmt = db.prepare(`
    INSERT INTO services (
      id, project_id, name, type, command, working_dir, docker_image, dockerfile, port, status,
      auto_restart, restart_count, max_restarts, stop_with_hoster, healthcheck_path, start_mode,
      last_exit_code, last_started_at, last_stopped_at, github_repo_url, github_branch, github_auto_pull,
      ssl_status, linked_database_id, depends_on, environment, compose_service_name, compose_file_hash,
      tunnel_url, quick_tunnel_enabled, last_attempted_commit, runtime_pgid, created_at, updated_at
    ) VALUES (
      @id, @project_id, @name, @type, @command, @working_dir, @docker_image, @dockerfile, @port, @status,
      @auto_restart, @restart_count, @max_restarts, @stop_with_hoster, @healthcheck_path, @start_mode,
      @last_exit_code, @last_started_at, @last_stopped_at, @github_repo_url, @github_branch, @github_auto_pull,
      @ssl_status, @linked_database_id, @depends_on, @environment, @compose_service_name, @compose_file_hash,
      @tunnel_url, @quick_tunnel_enabled, @last_attempted_commit, @runtime_pgid, @created_at, @updated_at
    )
  `);
  const databaseStmt = db.prepare(`
    INSERT INTO databases (
      id, project_id, name, engine, port, container_id, connection_string, username, password, database_name, created_at
    ) VALUES (
      @id, @project_id, @name, @engine, @port, @container_id, @connection_string, @username, @password, @database_name, @created_at
    )
  `);
  const deploymentStmt = db.prepare(`
    INSERT INTO deployments (
      id, service_id, commit_hash, status, build_log, artifact_path, created_at,
      started_at, finished_at, branch, trigger_source, git_sha, duration_ms, failure_stage
    ) VALUES (
      @id, @service_id, @commit_hash, @status, @build_log, @artifact_path, @created_at,
      @started_at, @finished_at, @branch, @trigger_source, @git_sha, @duration_ms, @failure_stage
    )
  `);
  const proxyStmt = db.prepare(`
    INSERT INTO proxy_routes (id, service_id, domain, target_port, created_at)
    VALUES (@id, @service_id, @domain, @target_port, @created_at)
  `);
  const certStmt = db.prepare(`
    INSERT INTO certificates (id, domain, fullchain, privkey, expires_at, created_at)
    VALUES (@id, @domain, @fullchain, @privkey, @expires_at, @created_at)
  `);
  const metricStmt = db.prepare(`
    INSERT INTO metrics (id, service_id, cpu_percent, memory_mb, timestamp)
    VALUES (@id, @service_id, @cpu_percent, @memory_mb, @timestamp)
  `);
  const logStmt = db.prepare(`
    INSERT INTO logs (id, service_id, level, message, timestamp)
    VALUES (@id, @service_id, @level, @message, @timestamp)
  `);
  const notificationStmt = db.prepare(`
    INSERT INTO notifications (id, kind, severity, title, body, service_id, read, created_at)
    VALUES (@id, @kind, @severity, @title, @body, @service_id, @read, @created_at)
  `);
  const backupStmt = db.prepare(`
    INSERT INTO database_backups (id, database_id, filename, size_bytes, created_at)
    VALUES (@id, @database_id, @filename, @size_bytes, @created_at)
  `);
  const projectEnvStmt = db.prepare(`
    INSERT INTO project_env_vars (id, project_id, key, value, is_secret)
    VALUES (@id, @project_id, @key, @value, @is_secret)
  `);
  const envStmt = db.prepare(`
    INSERT INTO env_vars (id, service_id, key, value, is_secret, system)
    VALUES (@id, @service_id, @key, @value, @is_secret, @system)
  `);
  const auditStmt = db.prepare(`
    INSERT INTO audit_logs (
      id, actor, action, resource_type, resource_id, status_code, details, created_at,
      target_type, target_id, source_ip, user_agent
    ) VALUES (
      @id, @actor, @action, @resource_type, @resource_id, @status_code, @details, @created_at,
      @target_type, @target_id, @source_ip, @user_agent
    )
  `);

  const transaction = db.transaction(() => {
    const now = isoMinutesAgo(0);
    projectStmt.run({
      id: "proj-production",
      name: "Mast3kMedia Production",
      description: "Public website, portfolio API, admin panel and case-media pipeline.",
      git_url: "https://github.com/Flyvendedk799/Mast3kMedia",
      created_at: isoMinutesAgo(1440),
      updated_at: now
    });
    projectStmt.run({
      id: "proj-ops",
      name: "Internal Ops",
      description: "Automation workers, preview sandboxes and deployment diagnostics.",
      git_url: "https://github.com/Flyvendedk799/ServerHoster",
      created_at: isoMinutesAgo(1260),
      updated_at: isoMinutesAgo(12)
    });

    const services = [
      {
        id: "svc-web",
        project_id: "proj-production",
        name: "mast3kmedia-web",
        type: "static",
        command: "npm run build && npm run preview -- --host 0.0.0.0",
        working_dir: "/srv/survhub/projects/mast3kmedia-web",
        docker_image: "",
        dockerfile: "",
        port: 4173,
        status: "running",
        auto_restart: 1,
        restart_count: 0,
        max_restarts: 5,
        stop_with_hoster: 1,
        healthcheck_path: "/",
        start_mode: "auto",
        last_exit_code: null,
        last_started_at: isoMinutesAgo(34),
        last_stopped_at: null,
        github_repo_url: "https://github.com/Flyvendedk799/Mast3kMedia",
        github_branch: "main",
        github_auto_pull: 1,
        ssl_status: "cloudflare",
        linked_database_id: "db-portfolio",
        depends_on: "portfolio-api",
        environment: "production",
        compose_service_name: "web",
        compose_file_hash: "sha256:9a0e7d7c",
        tunnel_url: "https://mast3kmedia.dk",
        quick_tunnel_enabled: 0,
        last_attempted_commit: "a18c42f",
        runtime_pgid: null,
        created_at: isoMinutesAgo(30),
        updated_at: isoMinutesAgo(8)
      },
      {
        id: "svc-api",
        project_id: "proj-production",
        name: "portfolio-api",
        type: "process",
        command: "node server.js",
        working_dir: "/srv/survhub/projects/portfolio-api",
        docker_image: "",
        dockerfile: "",
        port: 8787,
        status: "running",
        auto_restart: 1,
        restart_count: 1,
        max_restarts: 5,
        stop_with_hoster: 1,
        healthcheck_path: "/api/health",
        start_mode: "auto",
        last_exit_code: null,
        last_started_at: isoMinutesAgo(41),
        last_stopped_at: isoMinutesAgo(42),
        github_repo_url: "https://github.com/Flyvendedk799/Mast3kMedia",
        github_branch: "main",
        github_auto_pull: 1,
        ssl_status: "cloudflare",
        linked_database_id: "db-portfolio",
        depends_on: "",
        environment: "production",
        compose_service_name: "api",
        compose_file_hash: "sha256:9a0e7d7c",
        tunnel_url: "https://api.mast3kmedia.dk",
        quick_tunnel_enabled: 0,
        last_attempted_commit: "b73e91d",
        runtime_pgid: null,
        created_at: isoMinutesAgo(35),
        updated_at: isoMinutesAgo(6)
      },
      {
        id: "svc-worker",
        project_id: "proj-ops",
        name: "case-capture-worker",
        type: "process",
        command: "node scripts/capture-cases.mjs --queue reference",
        working_dir: "/srv/survhub/projects/case-capture-worker",
        docker_image: "",
        dockerfile: "",
        port: 3090,
        status: "running",
        auto_restart: 1,
        restart_count: 0,
        max_restarts: 3,
        stop_with_hoster: 1,
        healthcheck_path: "/health",
        start_mode: "auto",
        last_exit_code: null,
        last_started_at: isoMinutesAgo(18),
        last_stopped_at: null,
        github_repo_url: "https://github.com/Flyvendedk799/ServerHoster",
        github_branch: "main",
        github_auto_pull: 1,
        ssl_status: "none",
        linked_database_id: "db-cache",
        depends_on: "portfolio-api",
        environment: "production",
        compose_service_name: "worker",
        compose_file_hash: "sha256:19bf016a",
        tunnel_url: "",
        quick_tunnel_enabled: 0,
        last_attempted_commit: "e5a91bc",
        runtime_pgid: null,
        created_at: isoMinutesAgo(40),
        updated_at: isoMinutesAgo(4)
      },
      {
        id: "svc-preview",
        project_id: "proj-ops",
        name: "preview-sandbox",
        type: "static",
        command: "npm run preview -- --host 0.0.0.0",
        working_dir: "/srv/survhub/projects/preview-sandbox",
        docker_image: "",
        dockerfile: "",
        port: 4180,
        status: "stopped",
        auto_restart: 0,
        restart_count: 0,
        max_restarts: 2,
        stop_with_hoster: 1,
        healthcheck_path: "/",
        start_mode: "manual",
        last_exit_code: 0,
        last_started_at: isoMinutesAgo(230),
        last_stopped_at: isoMinutesAgo(82),
        github_repo_url: "https://github.com/Flyvendedk799/Mast3kMedia",
        github_branch: "reference-case",
        github_auto_pull: 0,
        ssl_status: "managed",
        linked_database_id: null,
        depends_on: "",
        environment: "staging",
        compose_service_name: "preview",
        compose_file_hash: "sha256:5600f47d",
        tunnel_url: "https://preview.mast3kmedia.dk",
        quick_tunnel_enabled: 1,
        last_attempted_commit: "c0ffee1",
        runtime_pgid: null,
        created_at: isoMinutesAgo(520),
        updated_at: isoMinutesAgo(82)
      }
    ];
    for (const service of services) serviceStmt.run(service);

    const databases = [
      {
        id: "db-portfolio",
        project_id: "proj-production",
        name: "portfolio-postgres",
        engine: "postgres",
        port: 54329,
        container_id: "",
        connection_string: "postgresql://survhub:••••••@localhost:54329/mast3kmedia",
        username: "survhub",
        password: "reference",
        database_name: "mast3kmedia",
        created_at: isoMinutesAgo(1390)
      },
      {
        id: "db-cache",
        project_id: "proj-ops",
        name: "capture-redis",
        engine: "redis",
        port: 63791,
        container_id: "",
        connection_string: "redis://localhost:63791",
        username: "",
        password: "",
        database_name: "",
        created_at: isoMinutesAgo(840)
      }
    ];
    for (const row of databases) databaseStmt.run(row);

    const deployments = [
      {
        id: "dep-web-106",
        service_id: "svc-web",
        commit_hash: "a18c42f",
        status: "success",
        build_log:
          "git fetch origin main\nnpm ci\nnpm run build\nvite build completed in 8.7s\nCloudflare ingress rule already healthy\nService mast3kmedia-web restarted on :4173",
        artifact_path: "/srv/survhub/artifacts/mast3kmedia-web/a18c42f",
        created_at: isoMinutesAgo(11),
        started_at: isoMinutesAgo(13),
        finished_at: isoMinutesAgo(11),
        branch: "main",
        trigger_source: "webhook",
        git_sha: "a18c42fd6c1a934b217a9f4d4f0ba1139a11d9be",
        duration_ms: 74200,
        failure_stage: null
      },
      {
        id: "dep-api-088",
        service_id: "svc-api",
        commit_hash: "b73e91d",
        status: "success",
        build_log:
          "git fetch origin main\nnpm ci --omit=dev\nnode scripts/migrate.mjs\nhealthcheck /api/health returned 200\nportfolio-api adopted process group and resumed traffic",
        artifact_path: "/srv/survhub/artifacts/portfolio-api/b73e91d",
        created_at: isoMinutesAgo(24),
        started_at: isoMinutesAgo(27),
        finished_at: isoMinutesAgo(24),
        branch: "main",
        trigger_source: "gitops-poller",
        git_sha: "b73e91d1983ed413f4cc217a90ef820af0f5a001",
        duration_ms: 168000,
        failure_stage: null
      },
      {
        id: "dep-worker-042",
        service_id: "svc-worker",
        commit_hash: "e5a91bc",
        status: "success",
        build_log:
          "queued by manual trigger\ncloning https://github.com/Flyvendedk799/ServerHoster\nnpm ci\nbuilding capture worker bundle\nstreaming build logs over WebSocket",
        artifact_path: "/srv/survhub/artifacts/case-capture-worker/e5a91bc",
        created_at: isoMinutesAgo(2),
        started_at: isoMinutesAgo(2),
        finished_at: isoMinutesAgo(1),
        branch: "main",
        trigger_source: "manual",
        git_sha: "e5a91bc2f4c7e8ac4f61c60fc4f9934305bdf016",
        duration_ms: 73000,
        failure_stage: null
      },
      {
        id: "dep-preview-014",
        service_id: "svc-preview",
        commit_hash: "c0ffee1",
        status: "failed",
        build_log:
          "git fetch origin reference-case\nnpm ci\nnpm run build\nDeploy failed: TypeScript check failed in reference media renderer\nKeeping previous preview offline until fix is pushed",
        artifact_path: "/srv/survhub/artifacts/preview-sandbox/c0ffee1",
        created_at: isoMinutesAgo(89),
        started_at: isoMinutesAgo(94),
        finished_at: isoMinutesAgo(89),
        branch: "reference-case",
        trigger_source: "manual",
        git_sha: "c0ffee19f44806d6f8c90bb752fe189d750a0462",
        duration_ms: 301000,
        failure_stage: "building"
      }
    ];
    for (const row of deployments) deploymentStmt.run(row);

    for (const route of [
      { id: "route-web", service_id: "svc-web", domain: "mast3kmedia.dk", target_port: 4173, created_at: isoMinutesAgo(1390) },
      { id: "route-api", service_id: "svc-api", domain: "api.mast3kmedia.dk", target_port: 8787, created_at: isoMinutesAgo(1388) },
      { id: "route-preview", service_id: "svc-preview", domain: "preview.mast3kmedia.dk", target_port: 4180, created_at: isoMinutesAgo(510) }
    ]) {
      proxyStmt.run(route);
      certStmt.run({
        id: `cert-${route.id}`,
        domain: route.domain,
        fullchain: "-----BEGIN CERTIFICATE-----\nreference\n-----END CERTIFICATE-----",
        privkey: "-----BEGIN PRIVATE KEY-----\nreference\n-----END PRIVATE KEY-----",
        expires_at: Date.now() + 1000 * 60 * 60 * 24 * 54,
        created_at: isoMinutesAgo(780)
      });
    }

    for (const backup of [
      { id: "backup-portfolio-1", database_id: "db-portfolio", filename: "portfolio-postgres-2026-06-11T20-45.sql.gz", size_bytes: 94_371_284, created_at: isoMinutesAgo(46) },
      { id: "backup-portfolio-2", database_id: "db-portfolio", filename: "portfolio-postgres-2026-06-10T20-45.sql.gz", size_bytes: 93_840_110, created_at: isoMinutesAgo(1486) },
      { id: "backup-cache-1", database_id: "db-cache", filename: "capture-redis-2026-06-11T19-30.rdb", size_bytes: 18_423_001, created_at: isoMinutesAgo(121) }
    ]) {
      backupStmt.run(backup);
    }

    for (const service of ["svc-web", "svc-api", "svc-worker"]) {
      for (let i = 8; i >= 0; i -= 1) {
        const base = service === "svc-web" ? 8 : service === "svc-api" ? 14 : 5;
        metricStmt.run({
          id: `met-${service}-${i}`,
          service_id: service,
          cpu_percent: Number((base + Math.sin(i) * 2.4).toFixed(2)),
          memory_mb: Number((service === "svc-api" ? 286 + i * 2.5 : service === "svc-web" ? 118 + i * 1.8 : 74 + i * 1.2).toFixed(1)),
          timestamp: isoMinutesAgo(i * 5)
        });
      }
    }

    const logRows = [
      ["svc-api", "info", "Fastify API listening on 0.0.0.0:8787"],
      ["svc-api", "info", "Applied 18 SQLite migrations; schema is current"],
      ["svc-api", "info", "GitOps poller checked main: b73e91d is already deployed"],
      ["svc-api", "warn", "Disk usage trending at 72%; backup retention remains within policy"],
      ["svc-api", "info", "POST /api/projects/server-hoster completed 200 in 42ms"],
      ["svc-api", "info", "Cloudflare tunnel connector healthy for api.mast3kmedia.dk"],
      ["svc-web", "info", "Vite preview serving static bundle on :4173"],
      ["svc-web", "info", "GET /case.html?slug=server-hoster 200"],
      ["svc-web", "info", "Cache warmed for featured portfolio media"],
      ["svc-web", "info", "Cloudflare route mast3kmedia.dk -> localhost:4173 is live"],
      ["svc-worker", "info", "Picked case-media job server-hoster/reference"],
      ["svc-worker", "info", "Captured dashboard-overview.jpg 1440x1000"],
      ["svc-worker", "info", "Captured deployments-pipeline.jpg 1440x1000"],
      ["svc-worker", "info", "Encoded authenticated walkthrough video"],
      ["svc-worker", "warn", "Preview sandbox skipped after failed TypeScript build"],
      ["svc-preview", "error", "Deploy failed: TypeScript check failed in reference media renderer"],
      ["svc-preview", "info", "Previous preview release intentionally remains stopped"]
    ];
    logRows.forEach(([service_id, level, message], index) => {
      logStmt.run({
        id: `log-${String(index).padStart(3, "0")}`,
        service_id,
        level,
        message,
        timestamp: isoMinutesAgo(35 - index * 2)
      });
    });

    for (const row of [
      {
        id: "notif-cloudflare",
        kind: "cloudflare",
        severity: "info",
        title: "Cloudflare tunnel healthy",
        body: "mast3kmedia.dk and api.mast3kmedia.dk are routed to the local services.",
        service_id: "svc-web",
        read: 0,
        created_at: isoMinutesAgo(18)
      },
      {
        id: "notif-backup",
        kind: "backup",
        severity: "info",
        title: "Nightly backup completed",
        body: "portfolio-postgres snapshot finished and passed checksum verification.",
        service_id: "svc-api",
        read: 0,
        created_at: isoMinutesAgo(46)
      },
      {
        id: "notif-preview",
        kind: "deploy",
        severity: "warning",
        title: "Preview deploy needs attention",
        body: "reference-case branch failed during TypeScript build; production stayed untouched.",
        service_id: "svc-preview",
        read: 0,
        created_at: isoMinutesAgo(88)
      }
    ]) {
      notificationStmt.run(row);
    }

    for (const row of [
      { id: "env-prod-1", project_id: "proj-production", key: "NODE_ENV", value: "production", is_secret: 0 },
      { id: "env-prod-2", project_id: "proj-production", key: "MAST3KMEDIA_ADMIN_USER", value: "admin", is_secret: 1 },
      { id: "env-prod-3", project_id: "proj-production", key: "CLOUDFLARE_ACCOUNT_ID", value: "configured", is_secret: 1 }
    ]) {
      projectEnvStmt.run(row);
    }
    for (const row of [
      { id: "env-api-1", service_id: "svc-api", key: "DATABASE_URL", value: "postgresql://survhub:reference@localhost:54329/mast3kmedia", is_secret: 1, system: 1 },
      { id: "env-api-2", service_id: "svc-api", key: "PORT", value: "8787", is_secret: 0, system: 1 },
      { id: "env-worker-1", service_id: "svc-worker", key: "REDIS_URL", value: "redis://localhost:63791", is_secret: 0, system: 1 }
    ]) {
      envStmt.run(row);
    }

    for (const row of [
      {
        id: "audit-001",
        actor: "root-token",
        action: "POST /deployments/from-git",
        resource_type: "deployments",
        resource_id: "dep-web-106",
        status_code: 200,
        details: "request_ok",
        created_at: isoMinutesAgo(13),
        target_type: "deployments",
        target_id: "dep-web-106",
        source_ip: "127.0.0.1",
        user_agent: "localsurv-reference-capture"
      },
      {
        id: "audit-002",
        actor: "root-token",
        action: "POST /proxy/routes",
        resource_type: "proxy",
        resource_id: "route-preview",
        status_code: 200,
        details: "request_ok",
        created_at: isoMinutesAgo(510),
        target_type: "proxy",
        target_id: "route-preview",
        source_ip: "127.0.0.1",
        user_agent: "localsurv-reference-capture"
      }
    ]) {
      auditStmt.run(row);
    }
  });

  transaction();
  db.close();
}

async function screenshot(page, fileName, options = {}) {
  await page.mouse.move(100, 20);
  await page.waitForTimeout(options.pause ?? 900);
  await page.screenshot({
    path: path.join(outputDir, fileName),
    type: "jpeg",
    quality: 86,
    fullPage: false
  });
}

async function main() {
  const apiPort = await getFreePort();
  const webPort = await getFreePort();
  const proxyPort = await getFreePort();
  const apiBase = `http://127.0.0.1:${apiPort}`;
  const webBase = `http://127.0.0.1:${webPort}`;

  let server;
  let web;
  try {
    server = spawnLogged("localsurv-server", "npm", ["run", "dev", "-w", "@survhub/server"], {
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
    seedReferenceData(path.join(dataDir, "survhub.db"));

    web = spawnLogged("localsurv-web", "npm", [
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
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
      recordVideo: { dir: rawVideoDir, size: { width: 1440, height: 1000 } }
    });
    await context.addInitScript((token) => {
      localStorage.setItem("survhub_token", token);
      localStorage.setItem("survhub_theme", "dark");
      localStorage.setItem("survhub_sidebar", "expanded");
      sessionStorage.setItem("survhub_prefer_login", "1");
    }, authToken);
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
    const page = await context.newPage();

    async function visit(route, selector) {
      await page.goto(`${webBase}${route}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(selector, { timeout: 20000 });
      await page.addStyleTag({ content: captureCss }).catch(() => undefined);
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
      await page.waitForTimeout(700);
    }

    await visit("/dashboard", ".dashboard-page");
    await page.getByText(/Real-time streaming active/).waitFor({ timeout: 5000 }).catch(() => undefined);
    await screenshot(page, "serverhoster-01-dashboard-overview.jpg");
    await page.mouse.wheel(0, 520);
    await screenshot(page, "serverhoster-02-dashboard-health-and-activity.jpg", { pause: 500 });

    await visit("/services", ".services-page");
    await page.getByRole("button", { name: "Prod" }).click({ timeout: 3000 }).catch(() => undefined);
    await page.evaluate(() => window.scrollTo(0, 320));
    await screenshot(page, "serverhoster-03-service-control-plane.jpg");

    await visit("/deployments", ".deployments-page");
    await page.evaluate(() => window.scrollTo(0, 280));
    await screenshot(page, "serverhoster-04-deployment-pipeline.jpg");

    await visit("/services/svc-api/logs", ".service-logs-page");
    await page.getByText(/Streaming live logs/).waitFor({ timeout: 5000 }).catch(() => undefined);
    await screenshot(page, "serverhoster-05-terminal-logs.jpg");

    await visit("/proxy", ".proxy-page");
    await screenshot(page, "serverhoster-06-edge-ingress.jpg");

    await visit("/databases", ".databases-page");
    await page.waitForTimeout(1000);
    await screenshot(page, "serverhoster-07-database-operations.jpg");

    await page.goto(`${webBase}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".dashboard-page");
    await page.waitForTimeout(1200);
    await page.goto(`${webBase}/services`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".services-page");
    await page.mouse.wheel(0, 420);
    await page.waitForTimeout(1200);
    await page.goto(`${webBase}/deployments`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".deployments-page");
    await page.mouse.wheel(0, 380);
    await page.waitForTimeout(1400);
    await page.goto(`${webBase}/services/svc-api/logs`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".service-logs-page");
    await page.mouse.wheel(0, 220);
    await page.waitForTimeout(1400);
    await page.goto(`${webBase}/proxy`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".proxy-page");
    await page.waitForTimeout(1300);
    await page.goto(`${webBase}/databases`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".databases-page");
    await page.waitForTimeout(1300);

    const rawVideo = await page.video().path();
    await page.close();
    await context.close();
    await browser.close();
    const finalVideoPath = path.join(finalVideoDir, "serverhoster-authenticated-control-plane.webm");
    fs.copyFileSync(rawVideo, finalVideoPath);

    const summary = {
      apiBase,
      webBase,
      screenshots: fs.readdirSync(outputDir).filter((file) => file.endsWith(".jpg")),
      video: finalVideoPath,
      logs: logsDir
    };
    fs.writeFileSync(path.join(artifactRoot, "reference-media-summary.json"), JSON.stringify(summary, null, 2));
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
