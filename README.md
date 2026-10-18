# Phoenix Labs Academy

![Build Version](https://img.shields.io/badge/version-1.2.1-acid--lime.svg)
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
                        [Cf-Access-Jwt-Assertion / RS256 JWKS]
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

### Installation & Local Development Preview
```bash
# 1. Install dependencies
npm install

# 2. Build course assets (bundle, markdown files, and SQL migration)
npm run build:course

# 3. Run automated deployment & cryptographic auth verification suite
npm test

# 4. Start local Worker preview
npm run preview
```
When accessed without a Cloudflare Access gateway, the Worker derives a deterministic cryptographic SHA-256 session identifier (`OP-<8-HEX>`) from the client's `X-Operator-Session` UUID header.

---

## 2. Ingesting Research Packages & New Courses

Phoenix Labs Academy provides a multi-format, edge-optimized ingestion pipeline supporting single modules, full directory drops, and master course bundles.

### Method A: Course Bundle JSON Validation & Ingestion
```bash
# 1. Validate bundle integrity before committing
npm run validate:course -- courses/penetration-testing/course-bundle.json

# 2. Atomic ingest into Cloudflare D1 database with automatic track replacement
npm run ingest -- courses/penetration-testing/course-bundle.json --replace-track
```

### Method B: Batch Markdown Directory Validation & Ingestion
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
2. Select **JSON Payload** or **Markdown with YAML**.
3. Review or paste the payload.
4. Click **"Ingest to Cloudflare D1"** for atomic edge insertion via `POST /api/admin/ingest`.

---

## 3. Student Profile & Cross-Course Telemetry

Phoenix Labs Academy includes a dedicated **Student Profile** view tracking learner progression across all operational domains:
- **Global Mastery Metrics**: Overall curriculum completion percentage, total labs mastered vs in-flight, total time invested, and verification attempt accuracy.
- **Cross-Course Curricula Breakdown**: Granular status tracking across every ingested track (Penetration Testing, Threat Hunting, Malware Engineering).
- **Direct Lab Launch**: One-click deep link to jump directly into any specific module workbench from the profile matrix.
- **Edge Telemetry Audit Log**: Real-time session access log queried via `GET /api/student/profile`.

---

## 4. Deploying to Cloudflare Production

### Step 1: One-Push Deployment (Cloudflare Workers Builds or CLI)
`wrangler.toml` is pre-configured with `[build] command = "npm run build"` and `[assets]` static routing. Deploying via GitHub integration or CLI works out-of-the-box:
```bash
npm run deploy
```

### Step 2: Attach Cloudflare D1 Database Binding (Optional — Auto-Bootstrapped)
In the **Cloudflare Dashboard** -> **Workers & Pages** -> **phoenix-labs-academy** -> **Settings** -> **Bindings**:
1. Add a **D1 database** binding with Variable name `DB`.
2. On the first incoming request, the Worker automatically initializes the `tracks`, `modules`, `students`, and `student_module_progress` tables and seeds all 26 curriculum modules into D1.

### Step 3: Configure Zero Trust & Admin Secrets
Configure authentication and authorization secrets via Wrangler (never commit secrets or emails into `wrangler.toml`):
```bash
npx wrangler secret put ADMIN_EMAILS
npx wrangler secret put ADMIN_API_TOKEN
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
npx wrangler secret put CF_ACCESS_AUD
```

---

## 5. Enabling Cloudflare Zero Trust Access

1. Navigate to the **Cloudflare Zero Trust Dashboard** -> **Access** -> **Applications**.
2. Click **Add an application** -> **Self-hosted**.
3. Specify your custom Worker domain.
4. Set up an Access Policy allowing authorized operators via One-Time PIN, Google Workspace, or GitHub OAuth.
5. Cloudflare signs and injects the `Cf-Access-Jwt-Assertion` RS256 JWT header into incoming requests, which the Worker verifies cryptographically against `https://<CF_ACCESS_TEAM_DOMAIN>/cdn-cgi/access/certs` using WebCrypto.
