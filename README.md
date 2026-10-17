# Phoenix Labs Academy

![Build Version](https://img.shields.io/badge/version-1.2.0-acid--lime.svg)
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

## Enterprise Penetration Testing Curriculum (Phases 0 - 6)

Phoenix Labs Academy includes a comprehensive 24-week, 22-module Enterprise Penetration Testing curriculum synthesizing industry certification benchmarks (**CompTIA PenTest+ PT0-003**, **OffSec PEN-200/OSCP+**, **HackTheBox CPTS**, and **Zero-Point Security CRTO**):

- **Phase 0: Pre-Enrollment Readiness Diagnostic** (Modules 001–002): Systems administration baseline, network routing, and cognitive transition to adversarial graph-based attack paths.
- **Phase 1: Governance, Scoping, Compliance & Reconnaissance** (Modules 101–103): Rules of Engagement (RoE), legal safe harbor, OSINT, certificate transparency, and non-intrusive DNS mapping.
- **Phase 2: Network Infrastructure & Service Enumeration** (Modules 201–203): Port states, SMB null sessions, LDAP queries, SNMP MIB tree extraction, and vulnerability fingerprinting.
- **Phase 3: Web Application, API & LLM Security Assessment** (Modules 301–303): SQL injection, SSRF cloud IMDS credential extraction, OWASP API Top 10 BOLA/BFLA, and OWASP GenAI LLM01 prompt injection.
- **Phase 4: Host Security, Code Auditing & Privilege Analysis** (Modules 401–403): PoC source code auditing, Linux sudo/capabilities/SUID escalation, and Windows token impersonation / unquoted service paths.
- **Phase 5: Lateral Movement, Pivoting & Active Directory Compromise** (Modules 501–504): Ligolo-ng TUN-interface dual-homed multi-hop pivoting, Kerberoasting RC4/AES extraction, AS-REP roasting, BloodHound shortest-path Cypher analysis, and ACL abuse.
- **Phase 6: Red Team Operations, Remediation & Commercial Reporting** (Modules 601–602): Commercial executive report synthesis with CVSS v3.1 / remediation milestones, and comprehensive 12-question Capstone Synthesis Exam.

---

## 1. Local Development Setup

### Prerequisites
- Node.js 18+ installed
- NPM or PNPM

### Installation & Local Database Initialization
```bash
# 1. Install dependencies
npm install

# 2. Build course assets (bundle, markdown files, and SQL migration)
npm run build:course

# 3. Initialize local SQLite D1 database and seed full curriculum
npm run db:init:local

# 4. Start local development preview on port 8787
npm run preview
```
Visit `http://localhost:8787` in your browser. 
Locally, the Worker automatically defaults the user identity to `local-operator@localhost`.

---

## 2. Ingesting Research Packages & New Courses

Phoenix Labs Academy provides a multi-format, edge-optimized ingestion pipeline supporting single modules, full directory drops, and master course bundles.

### Method A: Course Bundle JSON Ingestion (Recommended for Multi-Module Tracks)
```bash
# 1. Validate bundle integrity before committing
npm run validate:course -- courses/penetration-testing/course-bundle.json

# 2. Atomic ingest into local D1 database with automatic track replacement
npm run ingest -- courses/penetration-testing/course-bundle.json --replace-track

# 3. Ingest into remote Cloudflare edge database
npm run ingest -- courses/penetration-testing/course-bundle.json --replace-track --remote
```

### Method B: Batch Markdown Directory Ingestion
```bash
# Validate and ingest an entire directory of individual module markdown files
npm run validate:course -- courses/penetration-testing/modules
npm run ingest -- courses/penetration-testing/modules
```

### Method C: Single Module CLI Ingestion (JSON or Markdown)
```bash
npm run validate:course -- sample_module.md
npm run ingest -- sample_module.md
```

### Method D: In-Browser Admin Modal
1. Click **"+ Ingest Material"** in the top navigation bar.
2. Select **Course Bundle JSON**, **Single Module JSON**, or **Markdown with Frontmatter**.
3. Review or paste the payload.
4. Click **"Ingest to Cloudflare D1"** for atomic edge insertion via `POST /api/admin/ingest`.

---

## 3. Student Profile & Cross-Course Telemetry

Phoenix Labs Academy includes a dedicated **Student Profile** view tracking learner progression across all operational domains:
- **Global Mastery Metrics**: Overall curriculum completion percentage, total labs mastered vs in-flight, total time invested, and verification attempt accuracy.
- **Cross-Course Curricula Breakdown**: Granular status tracking across every ingested track (Penetration Testing, Threat Hunting, Malware Engineering, Capstone Triage).
- **Direct Lab Launch**: One-click deep link to jump directly into any specific module workbench from the profile matrix.
- **Edge Telemetry Audit Log**: Real-time session access log queried from Cloudflare D1 via `GET /api/student/profile`.

---

## 4. Deploying to Cloudflare Production

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
