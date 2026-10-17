# Phoenix Labs Academy

![Build Version](https://img.shields.io/badge/version-1.0.0-emerald.svg)
![Runtime](https://img.shields.io/badge/runtime-Cloudflare%20Workerd-orange.svg)
![Database](https://img.shields.io/badge/database-Cloudflare%20D1%20SQLite-blue.svg)
![Auth](https://img.shields.io/badge/auth-Zero%20Trust%20Access-purple.svg)

**Phoenix Labs Academy** is an edge-native, multi-domain cybersecurity learning platform designed for technologists transitioning into offensive security, threat hunting, and malware engineering. Built for deployment on **Cloudflare Workers with Static Assets** and **Cloudflare D1**.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |       Cloudflare Global Edge          |
                      |  (Zero Trust Access Gateway / CF-WAF) |
                      +---------------------------------------+
                                          |
                        [Cf-Access-Authenticated-User-Email]
                                          |
                      +---------------------------------------+
                      |      Cloudflare Worker (Hono)         |
                      |     Serving Static Assets & API       |
                      +---------------------------------------+
                           /              |              \
               +-------------+    +---------------+    +----------------+
               |  Vite SPA   |    | Ingestion API |    | Verification & |
               | (React 18)  |    |  (Admin ACL)  |    | 30s Heartbeat  |
               +-------------+    +---------------+    +----------------+
                                          |
                      +---------------------------------------+
                      |         Cloudflare D1 (SQLite)        |
                      |  tracks, modules, students, progress  |
                      +---------------------------------------+
```

---

## 1. Local Development Setup

### Prerequisites
- Node.js 18+ installed
- NPM or PNPM

### Installation & Local Database Initialization
```bash
# 1. Install dependencies
npm install

# 2. Initialize local SQLite D1 database and seed curriculum
npm run db:init:local

# 3. Start local development preview on port 8787
npm run preview
```
Visit `http://localhost:8787` in your browser. 
Locally, the Worker automatically defaults the user identity to `local-operator@localhost`.

---

## 2. Ingesting Research Packages

Phoenix Labs Academy supports modular course material in both **JSON** and **Markdown with Frontmatter**.

### Method A: Standalone CLI Ingestion
```bash
# Validate curriculum package syntax and schema
npm run validate:course -- sample_module.md

# Ingest into local D1 database
npm run ingest -- sample_module.md

# Ingest into remote Cloudflare edge database
npm run ingest -- sample_module.md --remote
```

### Method B: In-Browser Admin Modal
1. Click **"+ Ingest Material"** in the top navigation bar.
2. Toggle between **JSON** and **Markdown with YAML**.
3. Click "Sample JSON" or "Sample Markdown" to view templates or paste your compiled package.
4. Click **"Ingest to Cloudflare D1"**.

---

## 3. Deploying to Cloudflare Production

### Step 1: Provision Cloudflare D1 Database
```bash
npx wrangler d1 create secops-db
```
Copy the returned `database_id` UUID into `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "secops-db"
database_id = "PASTE_YOUR_D1_UUID_HERE"
```

### Step 2: Push Relational Migrations to Edge
```bash
npm run db:init:remote
```

### Step 3: Configure Admin Allowlist in `wrangler.toml`
Set your authorized administrator emails in `wrangler.toml`:
```toml
[vars]
ADMIN_EMAILS = "admin@phoenixlabs.io,your.email@phoenixlabs.io"
```

### Step 4: Build & Deploy
```bash
npm run deploy
```

---

## 4. Enabling Cloudflare Zero Trust Access

1. Navigate to the **Cloudflare Zero Trust Dashboard** -> **Access** -> **Applications**.
2. Click **Add an application** -> **Self-hosted**.
3. Specify your custom Worker domain (e.g. `academy.phoenixlabs.io`).
4. Set up an Access Policy allowing your organization's emails via One-Time PIN, Google Workspace, or GitHub OAuth.
5. Cloudflare automatically signs and injects the `Cf-Access-Authenticated-User-Email` header into incoming requests. Phoenix Labs Academy transparently maps this to each student's progress and evaluates the `ADMIN_EMAILS` allowlist for curriculum ingestion.
