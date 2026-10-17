---
id: mod-pt-204
track_id: track-pentest
slug: quiz-phase-1-and-2-governance-recon-validation
title: '204: Quiz — Phase 1 & 2 Governance, OSINT & Enumeration Checkpoint'
difficulty: Fundamentals
order_index: 8
estimated_minutes: 15
lab_type: quiz
lab_briefing: Complete the 4 scenario questions covering Phase 1 (Governance & Automation) and Phase 2 (OSINT, Service Enumeration & Scanner Validation) to unlock the validation flag.
expected_flag: FLAG{RECON_AND_GOVERNANCE_VERIFIED}
hint: Answer all 4 questions accurately and click Use Validation Token to populate FLAG{RECON_AND_GOVERNANCE_VERIFIED}.
lab_config:
  passing_token: FLAG{RECON_AND_GOVERNANCE_VERIFIED}
  questions:
    - id: p12-q1
      prompt: During a gray-box penetration test of a healthcare network, you discover an unauthenticated web shell (/uploads/c99_apt.php) communicating with an unknown external IP address not belonging to your team. According to PT0-003 Domain 1 engagement governance, what is your immediate mandatory action?
      options:
        - Delete the web shell immediately and patch the server without notifying the client
        - Use the existing web shell to pivot into the Domain Controller and include it in the final report next week
        - Pause testing on the affected host, preserve forensic evidence/logs, and immediately trigger the emergency escalation path to the client stakeholder
        - Run an aggressive unthrottled Nessus scan against the external C2 IP address
      answerIndex: 2
      explanation: Discovering indicators of an active third-party breach requires immediate escalation to the client stakeholder and preservation of forensic integrity.
    - id: p12-q2
      prompt: Which of the following reconnaissance techniques is 100% passive (sending zero network packets to the target enterprise IP range) while uncovering unindexed internal/staging subdomains?
      options:
        - Running gobuster vhost -u https://target.com -w subdomains.txt
        - Querying public Certificate Transparency (CT) logs via crt.sh
        - Executing dig axfr @ns1.target.com target.com
        - Running nmap -sS -T2 --top-ports 100 target.com
      answerIndex: 1
      explanation: Certificate Transparency (crt.sh) queries public third-party CT log databases over HTTPS, sending zero packets to the target infrastructure, whereas vhost fuzzing, DNS zone transfers against target nameservers, and Nmap SYN scans all actively touch the target.
    - id: p12-q3
      prompt: An uncredentialed vulnerability scan flags Apache 2.4.52 on an Ubuntu 22.04 LTS server as vulnerable to a critical RCE based solely on its HTTP Server header. However, manual verification shows the server is immune. What is the most likely technical explanation?
      options:
        - The scanner used TCP SYN packets instead of UDP packets
        - Ubuntu backported the security patch into package revision 2.4.52-1ubuntu4.12 without changing the upstream 2.4.52 version banner (False Positive)
        - The server is running an unquoted Windows service path
        - Certificate Transparency logs encrypted the HTTP response body
      answerIndex: 1
      explanation: Enterprise Linux distributions backport security fixes into stable version numbers. Unauthenticated banner-only checks frequently generate False Positives when they ignore the distro patch revision.
    - id: p12-q4
      prompt: When enumerating NFS (TCP/2049) via showmount -e, which export configuration option in /etc/exports allows a remote root user on an attacker machine to mount the share and create SUID root binaries that execute as UID 0 on the server?
      options:
        - root_squash
        - no_root_squash
        - ro,nosuid
        - subtree_check
      answerIndex: 1
      explanation: When no_root_squash is enabled on an exported NFS share, files created by UID 0 (root) on the client retain UID 0 ownership on the NFS server, enabling trivial privilege escalation via a mounted SUID binary.
---

# 204: Quiz — Phase 1 & 2 Governance, OSINT & Enumeration Checkpoint

## Phase 1 & 2 Operational Synthesis

Before advancing to Phase 3 (Web, API & AI Exploitation), this checkpoint verifies your mastery of CompTIA PenTest+ PT0-003 Domains 1–3, OffSec PEN-200 Modules 1–8, and HTB CPTS Reconnaissance & Vulnerability Validation standards.

Review key principles:
- **Mid-Engagement Escalation**: Active third-party compromise or unauthenticated critical production exposure demands immediate stakeholder escalation rather than silent exploitation.
- **Zero-Touch Passive OSINT**: Certificate Transparency (`crt.sh`), WHOIS, public Git commits, and downloaded document `exiftool` metadata never send packets to the target infrastructure.
- **False Positive Filtration**: Distro backported security patches in Debian/RHEL cause unauthenticated banner scanners to report patched CVEs as vulnerable.
