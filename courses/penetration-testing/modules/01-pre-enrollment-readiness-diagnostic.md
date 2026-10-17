---
id: mod-pt-001
track_id: track-pentest
slug: pre-enrollment-readiness-diagnostic
title: '001: Pre-Enrollment Readiness Diagnostic (4 IT Pillars)'
difficulty: Fundamentals
order_index: 1
estimated_minutes: 20
lab_type: quiz
lab_briefing: Complete the 5-pillar Pre-Enrollment Readiness Diagnostic below at 100% accuracy to verify baseline proficiency across OS Internals, CIDR/Routing, Active Directory/PKI, and SIEM/OPSEC before unlocking Phase 1.
expected_flag: FLAG{SYSADMIN_BASELINE_DIAGNOSTIC_PASSED}
hint: Answer all 5 diagnostic pillar questions accurately, click Check Answers, and use the generated validation token.
lab_config:
  passing_token: FLAG{SYSADMIN_BASELINE_DIAGNOSTIC_PASSED}
  questions:
    - id: diag-1
      prompt: '[Pillar 1 — OS Internals] While auditing a Windows Server registry export under HKLM\SYSTEM\CurrentControlSet\Services\BackupAgent, you observe ObjectName set to "LocalSystem" and ImagePath set to C:\Program Files\Enterprise Backup\agent.exe (without quotes). If C:\Program Files\ is writable by your low-privilege user, what offensive primitive does this create?'
      options:
        - Kernel page-table corruption via SMBv3 compression
        - Unquoted Service Path privilege escalation to NT AUTHORITY\SYSTEM by planting C:\Program Files\Enterprise.exe
        - Automatic Kerberos Golden Ticket generation via LocalSystem SID
        - Remote Desktop Protocol (RDP) Network Level Authentication (NLA) downgrade
      answerIndex: 1
      explanation: When a Windows service ImagePath contains spaces and is unquoted, the Service Control Manager (SCM) sequentially attempts to execute C:\Program.exe and C:\Program Files\Enterprise.exe under the service account context (LocalSystem).
    - id: diag-2
      prompt: '[Pillar 2 — Network Architecture] During internal reconnaissance you discover a subnet mask of 255.255.255.224 (/27) on interface eth1 (192.168.147.129/27). How many usable host IP addresses exist in this subnet, and what is its broadcast address?'
      options:
        - 14 usable hosts; broadcast 192.168.147.143
        - 30 usable hosts; broadcast 192.168.147.159
        - 62 usable hosts; broadcast 192.168.147.191
        - 254 usable hosts; broadcast 192.168.147.255
      answerIndex: 1
      explanation: A /27 subnet has 32 total addresses (2^(32-27) = 32), yielding 30 usable host IPs (192.168.147.129 through 192.168.147.158) with network address .128 and broadcast address .159.
    - id: diag-3
      prompt: '[Pillar 3 — Identity & Kerberos] How does Active Directory Kerberos service ticket (TGS) encryption enable offline Kerberoasting without triggering domain controller account lockouts?'
      options:
        - The KDC sends the service account plaintext password inside the AS-REP packet
        - Any authenticated domain user can request a TGS ticket for a registered SPN, and the KDC encrypts the ticket using the target service account NTLM hash/secret key, allowing offline brute-forcing
        - Kerberos TGS tickets bypass all firewall ports by tunneling over ICMP Echo requests
        - Domain controllers disable password complexity checks whenever an SPN is queried via LDAP
      answerIndex: 1
      explanation: Because the TGS ticket is encrypted with the service account secret key (RC4-HMAC / AES), an attacker with any valid domain user account can request the ticket legitimately and crack it offline.
    - id: diag-4
      prompt: '[Pillar 4 — Defensive Telemetry & OPSEC] Under the Zero-Point Security CRTO and Phoenix Labs Capstone assessment model, how is Operational Security (OPSEC) weighted alongside technical flag capture?'
      options:
        - OPSEC is optional and only adds bonus points if a student misses technical flags
        - Assessments are scored 50% on Technical Objectives and 50% on OPSEC (85% total required), meaning noisy scans, account lockouts, or uncleaned agents cause exam failure
        - OPSEC only applies during passive OSINT and is disabled once a shell is obtained
        - Antivirus alerts automatically reboot the student Kali workstation without deducting points
      answerIndex: 1
      explanation: Modern red-team and enterprise assessments penalize noisy tradecraft (such as locking out AD accounts, crashing fragile services, or triggering un-obfuscated EDR alerts) at 50% of the total rubric.
    - id: diag-5
      prompt: '[Curriculum Baseline — PT0-003 Weighting] In the CompTIA PenTest+ (PT0-003) five-domain lifecycle, which domain carries the largest single assessment weighting (35%) and newly mandates Cloud, API, and AI Prompt Injection tradecraft?'
      options:
        - 'Domain 1: Engagement Management (13%)'
        - 'Domain 2: Reconnaissance and Enumeration (21%)'
        - 'Domain 3: Vulnerability Discovery and Analysis (17%)'
        - 'Domain 4: Attacks and Exploits (35%)'
      answerIndex: 3
      explanation: Domain 4 (Attacks and Exploits) accounts for 35% of PT0-003, integrating network, host, web, REST/GraphQL API, Cloud IAM/IMDS, and AI/LLM prompt injection attacks.
---

# 001: Pre-Enrollment Readiness Diagnostic (4 IT Pillars)

## From Systems Administrator to Adversarial Graph Thinker

Systems administrators represent the highest-potential candidate pool for offensive security because you already configure Active Directory domains, maintain Linux and Windows servers, and troubleshoot TCP/IP routing. However, transitioning requires a cognitive shift: moving from a **deterministic, availability-focused mindset** to an **adversarial, graph-based mindset**.

Where an administrator views an overly permissive service account, a legacy authentication protocol, and an unsegmented management VLAN as three separate maintenance tickets, a penetration tester perceives a **single chained attack path** leading to full domain compromise.

![Penetration Testing Lifecycle & Benchmark Weighting](/assets/curriculum/domain-weighting-benchmarks.png)

## Industry Benchmark Synthesis (PT0-003, OSCP+, CPTS & CRTO)

This 6-Phase curriculum synthesizes four complementary industry standards into one unbroken operational workflow:

| Benchmark | Format & Duration | Core Curriculum Competency |
| --- | --- | --- |
| **CompTIA PenTest+ (PT0-003)** | 165 mins (<=85 MCQs & PBQs) | Governance (13%), Recon (21%), Vuln Analysis (17%), Attacks & Exploits incl. Cloud/API/AI (35%), Post-Exploit (14%) |
| **OffSec PEN-200 (OSCP+)** | 24h Live Exploitation + 24h Report | Rapid host enumeration, public exploit modification, Linux/Windows PrivEsc, and foundational Active Directory |
| **HTB Academy CPTS** | 10-Day Black-Box Enterprise + Report | Exhaustive enumeration, multi-hop Ligolo-ng pivoting across 8+ hosts (12/14 flags), and 100+ page commercial reporting |
| **Zero-Point CRTO** | 48h Red Team Lab (50% Obj / 50% OPSEC) | C2 tradecraft, Living-off-the-Land (LotL), EDR evasion, and strict defender-console OPSEC scoring |

## The 4 Foundational Prerequisite Pillars & Offensive Reframing

Before entering Phase 1, verify your administrative baseline across four pillars:

| Administrative Competency | Defensive Mental Model | Offensive Tradecraft Reframing |
| --- | --- | --- |
| **Pillar 1: Compute & OS Internals (A+)** | Managing `/etc/fstab`, `systemd`, and `HKLM\SYSTEM\CurrentControlSet\Services` for uptime | Auditing SUID binaries, hijacking unquoted service paths, abusing `SeImpersonatePrivilege`, and dumping LSASS |
| **Pillar 2: Network Mechanics (Network+)** | Configuring VLANs, CIDR masks, ARP tables, and firewall ACLs | Identifying dual-homed pivot hosts, routing virtual TUN interfaces (`ligolo-ng`), and mapping `240.0.0.1/32` loopback |
| **Pillar 3: Identity & Crypto (Security+)** | Provisioning AD users, GPOs, PKI certificates, and cloud IAM roles | BloodHound ACL graph mapping, Kerberoasting, ADCS `ESC1` template spoofing, and SSRF-to-IMDS credential theft |
| **Pillar 4: Defensive SIEM/EDR (Security+)** | Reviewing Sysmon logs, EDR alerts, and incident tickets | Calibrating lockout-safe sprays, evading user-land API hooks, and passing the 50% OPSEC Capstone rubric |
