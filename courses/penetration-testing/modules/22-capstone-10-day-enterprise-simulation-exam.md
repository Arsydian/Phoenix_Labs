---
id: mod-pt-602
track_id: track-pentest
slug: capstone-10-day-enterprise-simulation-exam
title: '602: Capstone Exam — 10-Day Enterprise Simulation & Certification Mastery'
difficulty: Advanced
order_index: 22
estimated_minutes: 25
lab_type: quiz
lab_briefing: Demonstrate your mastery across the complete 6-Phase curriculum by answering the Capstone comprehensive scenario questions.
expected_flag: FLAG{PHOENIX_PENTEST_CAPSTONE_GRADUATE_2026}
hint: Complete all 4 Capstone questions accurately to obtain FLAG{PHOENIX_PENTEST_CAPSTONE_GRADUATE_2026}.
lab_config:
  passing_token: FLAG{PHOENIX_PENTEST_CAPSTONE_GRADUATE_2026}
  questions:
    - id: cap-1
      prompt: During Day 1 of the 10-Day Capstone, you compromise a Linux web server in the DMZ and discover an internal service listening on 127.0.0.1:8080. Using Ligolo-ng, how do you route traffic to this remote loopback service from your Kali terminal without creating a local port forward for every single port?
      options:
        - Add the route "sudo ip route add 240.0.0.1/32 dev ligolo" on Kali and connect to http://240.0.0.1:8080
        - Edit /etc/hosts to point localhost to 192.168.1.9
        - Reboot the DMZ server with iptables disabled
        - Run nmap -sU on UDP port 53
      answerIndex: 0
      explanation: Ligolo-ng reserves the 240.0.0.1/32 virtual address space to route traffic seamlessly to the loopback interface of the target where the agent is running.
    - id: cap-2
      prompt: During Day 4 in the Active Directory environment, you discover the domain lockout policy locks accounts after 5 failed attempts in 5 minutes. What is the correct operational procedure for password spraying to avoid OPSEC point deductions?
      options:
        - Spray 10 passwords per user concurrently using Hydra
        - Calibrate the spray to test no more than 2–3 passwords per user, then wait at least 6 minutes before spraying the next password candidate
        - Spray only during nighttime hours without rate limits
        - Disable the domain controller network interface before spraying
      answerIndex: 1
      explanation: Testing 2–3 passwords and waiting longer than the 5-minute lockout observation window guarantees accounts will not lock out, preserving OPSEC.
    - id: cap-3
      prompt: When auditing Active Directory Certificate Services (ADCS), what condition creates the critical ESC1 privilege escalation vulnerability?
      options:
        - The certificate template enforces smart-card only login
        - The template permits client authentication, grants enrollment rights to low-privilege users, and has CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT enabled
        - The CA root certificate is expired
        - LDAP signing is enforced on the domain controller
      answerIndex: 1
      explanation: ESC1 occurs when an enrollee can specify an arbitrary Subject Alternative Name (SAN/UPN) such as Administrator on a template that permits client authentication.
    - id: cap-4
      prompt: Under CompTIA PenTest+ (PT0-003) and HTB CPTS reporting standards, why must every technical finding be paired with both a Technical Control and an Administrative/Process Control?
      options:
        - To increase the page count of the deliverable
        - Because technical patches fix specific software vulnerabilities, while administrative controls (e.g., least-privilege, patch management cadence, code review) prevent recurrence across the organization
        - Administrative controls are only required for government contracts
        - To satisfy firewall compliance rules
      answerIndex: 1
      explanation: Pairing technical controls (e.g., parameterizing queries) with administrative governance (e.g., secure SDLC and RBAC audits) ensures long-term operational remediation.
---

# 602: Capstone Exam — 10-Day Enterprise Simulation & Certification Mastery

## The 10-Day Practical Capstone Assessment & Scoring Model

The Capstone Exam synthesizes the full curriculum into a black-box enterprise simulation across 10 interconnected hosts (DMZ, Internal Tier 1, GOAD Active Directory, and Cloud Vault):
- **Technical Threshold**: Capture at least 12 of the 14 available flags (80% minimum).
- **OPSEC Rubric (50% Weighting)**: Avoid account lockouts (<=5 attempts/5min), avoid unthrottled scanner floods, and ensure 100% artifact cleanup.
- **Commercial Report Deliverable**: A fully reproducible 8-section report with timestamped CLI copy-paste commands and actionable technical/administrative remediation recommendations.
