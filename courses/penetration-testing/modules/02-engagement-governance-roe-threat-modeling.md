---
id: mod-pt-101
track_id: track-pentest
slug: engagement-governance-roe-threat-modeling
title: '101: Engagement Governance, ROE & STRIDE/DREAD Threat Modeling'
difficulty: Fundamentals
order_index: 2
estimated_minutes: 30
lab_type: siem
lab_briefing: 'You are Lead Consultant on the RetailBank Hybrid-Cloud Engagement (in-scope CIDR: 10.20.10.0/24). Inspect the live engagement audit telemetry stream below. Identify the event that requires an immediate Mid-Engagement Critical Finding Escalation (an exposed production HSM/database master key and active third-party anomaly), decode the UTF-16LE Base64 escalation payload, and submit the Critical Escalation Token.'
expected_flag: FLAG{ROE_CRITICAL_ESCALATION_TRIGGERED}
hint: Filter the telemetry by 911 or CRITICAL_ESCALATION_TRIGGER, click Decode UTF-16LE Base64 Payload, and remove any internal spaces if present or submit FLAG{ROE_CRITICAL_ESCALATION_TRIGGERED}.
lab_config:
  logs:
    - timestamp: '2026-10-17T09:05:11Z'
      host: ROE-AUDIT-GATEWAY
      event_id: 100
      parent_image: EngagementScopeValidator
      image: ScopeCheck::CIDR_Verify
      command_line: ' ROE_STATUS=AUTHORIZED | In-Scope: 10.20.10.0/24 (RetailBank Staging) | Excluded: 10.99.0.0/16 (Core SWIFT Wire Mainframe - Fragile)'
    - timestamp: '2026-10-17T09:14:28Z'
      host: 10.20.10.15 (rb-web-01)
      event_id: 204
      parent_image: STRIDE_ThreatModeler
      image: Classification::InformationDisclosure
      command_line: 'STRIDE=Information_Disclosure | DREAD_SCORE=9.4/10 | Asset=Payment_API_Gateway | Note: Unauthenticated /.git/config and backup bundle exposed on public interface'
    - timestamp: '2026-10-17T09:22:03Z'
      host: 10.20.10.15 (rb-web-01)
      event_id: 911
      parent_image: CRITICAL_ESCALATION_TRIGGER
      image: EmergencyStakeholderAlert.exe
      command_line: powershell.exe -NoP -Exec Bypass -Enc RgBMAEEARwB7AFIAbwBF AF8AQwBSAEkAVABJAEMAQQBM AF8ARQBTAEMAQQBMAEEAVABJAE8ATgBfAFQAUgBJAEcARwBFAFIARQBEAH0A
    - timestamp: '2026-10-17T09:25:40Z'
      host: 10.20.10.44 (rb-auth-02)
      event_id: 301
      parent_image: ScannerThrottleMonitor
      image: NucleiSafeCheck
      command_line: SCAN_RATE=25_req_sec | SafeChecks=Enabled | CompensatingControl=WAF_RateLimit_Active
---

# 101: Engagement Governance, ROE & STRIDE/DREAD Threat Modeling

## Sub-Unit 1.1 & 1.2: Legal Prerequisites, Scoping & Rules of Engagement (ROE)

Professional penetration testing begins long before an Nmap packet leaves your interface. Operating without explicit, counter-signed **Written Authorization** ("Get Out of Jail Free" mandate) violates computer crime statutes (such as the CFAA and UK Computer Misuse Act), especially when cloud infrastructure is shared with third-party providers requiring multi-tenant authorization.

Your **Rules of Engagement (ROE)** and scoping contract must explicitly define:
- **Assessment Model**: **Black-Box** (zero prior knowledge; simulates external adversary), **Gray-Box** (standard user credentials or CIDR knowledge; models an assumed breach or insider), or **White-Box** (full architecture diagrams, source code, and admin configs).
- **Target Boundaries & Exclusions**: Permitted CIDR blocks, domain wildcards, cloud tenant IDs, and fragile legacy/medical/OT exclusions.
- **Mid-Engagement Goal Reprioritization & Critical Escalation**: If you uncover an active third-party breach (e.g., an unknown adversary's webshell/ransomware staging) or an unauthenticated critical production exposure (such as cleartext production database keys or unauthenticated Domain Controller RCE), you must **immediately pause exploitation on that vector and trigger the emergency escalation path** to the client stakeholder.

## Sub-Unit 1.3: Formal Threat Modeling (STRIDE, DREAD & OCTAVE)

CompTIA PenTest+ (PT0-003 Domain 1) requires formal threat modeling to align technical attack vectors with business risk:

| Framework | Core Components | Operational Usage in Penetration Testing |
| --- | --- | --- |
| **STRIDE** | **S**poofing, **T**ampering, **R**epudiation, **I**nformation Disclosure, **D**enial of Service, **E**levation of Privilege | Categorizing architectural flaws across web, API, network, and Active Directory trust boundaries |
| **DREAD** | **D**amage potential, **R**eproducibility, **E**xploitability, **A**ffected users, **D**iscoverability | Quantifying and ranking candidate attack paths (1–10 scale) to prioritize high-value targets |
| **OCTAVE** | Operationally Critical Threat, Asset, and Vulnerability Evaluation | Business-aligned workshop methodology focusing on organizational assets and operational resilience rather than pure tech |

## Sub-Unit 1.4: SQ3R/PQ4R Comprehension & Real-Time Host-Tagged Logging

Two of the top five causes of failure in practical assessments (like the 10-day HTB CPTS and 24-hour OSCP+) are **incomplete enumeration** and **assembling reports from cold notes on the final day**.

From Day 1, operators maintain a hierarchical, host-tagged Markdown workspace:
```text
engagement-notes/
├── 00-scope-and-roe.md
├── 01-stride-threat-model.md
├── hosts/
│   ├── 192.168.1.9-dmz-ignite-01.md
│   └── 172.16.60.10-dc01-sevenkingdoms.md
└── findings/
    └── FINDING-01-unauthenticated-prod-key-exposure.md
```
Every command executed must be logged with its timestamp, target IP, and output snippet in real time.
