---
id: mod-pt-201
track_id: track-pentest
slug: passive-reconnaissance-osint-intelligence
title: '201: Passive Reconnaissance & Open-Source Intelligence (OSINT)'
difficulty: Fundamentals
order_index: 5
estimated_minutes: 30
lab_type: terminal
lab_briefing: Execute a zero-touch passive OSINT assessment against megacorp-fin.htb (any direct TCP/UDP packet to target IPs is prohibited). Query the local Certificate Transparency cache for crt.sh subdomains, extract embedded author metadata from the public Q3_Investor_Brief.pdf using exiftool, and audit the public Git repository commit history to recover the leaked staging token flag.
expected_flag: FLAG{ZERO_TOUCH_CT_GIT_EXIF_OSINT}
hint: Inspect the removed line in the Git commit history (git -C ./megacorp-public-sdk log -p -n 2) to find FLAG{ZERO_TOUCH_CT_GIT_EXIF_OSINT}.
lab_config:
  target_ip: PASSIVE-OSINT-ONLY (Zero Target Packets)
  quick_commands:
    - curl -s "https://crt.sh/?q=%25.megacorp-fin.htb&output=json" | jq -r ".[].name_value" | sort -u
    - exiftool Q3_Investor_Brief.pdf
    - git -C ./megacorp-public-sdk log -p -n 2
  commands:
    curl -s "https://crt.sh/?q=%25.megacorp-fin.htb&output=json" | jq -r ".[].name_value" | sort -u: |-
      auth-sso.megacorp-fin.htb
      dev-k8s-api.megacorp-fin.htb
      git-mirror.megacorp-fin.htb
      vpn-east.megacorp-fin.htb
      www.megacorp-fin.htb
    exiftool Q3_Investor_Brief.pdf: |-
      ExifTool Version Number         : 12.76
      File Name                       : Q3_Investor_Brief.pdf
      Author                          : j.mormont (MEGACORP-AD\j.mormont)
      Creator                         : Microsoft Word 2021 (\\srv-files01.megacorp-fin.local\finance$\templates\)
      Producer                        : macOS Version 14.5 Quartz PDFContext
      [+] Deduced AD Username Convention: <first_initial>.<lastname>
    git -C ./megacorp-public-sdk log -p -n 2: |-
      commit 8a41f92c1b0e (HEAD -> main)
      Author: j.mormont <j.mormont@megacorp-fin.htb>
      Date:   Wed Oct 14 16:40:12 2026 -0400

          Remove hardcoded staging token before public release

      diff --git a/config/staging.env b/config/staging.env
      --- a/config/staging.env
      +++ b/config/staging.env
      @@ -1,3 +1,2 @@
       API_ENDPOINT=https://dev-k8s-api.megacorp-fin.htb
      -STAGING_AUTH_TOKEN=FLAG{ZERO_TOUCH_CT_GIT_EXIF_OSINT}
      +STAGING_AUTH_TOKEN=REDACTED_USE_VAULT
---

# 201: Passive Reconnaissance & Open-Source Intelligence (OSINT)

## Sub-Unit 4.1: Zero-Touch Passive Boundary & Certificate Transparency (crt.sh)

In CompTIA PenTest+ (PT0-003 Domain 2 — 21%) and red-team engagements, **Passive Reconnaissance** builds the target intelligence dossier without sending a single packet to the target's IP space.

When organizations provision TLS certificates (including Let's Encrypt or DigiCert certificates for internal staging portals), Certificate Authorities publish the certificate's Subject Alternative Names (SANs) to public **Certificate Transparency (CT) logs**. By querying `crt.sh` via JSON, an operator discovers unindexed development, VPN, and staging subdomains with zero target interaction:
```bash
curl -s "https://crt.sh/?q=%25.megacorp-fin.htb&output=json" | jq -r '.[].name_value' | sort -u
```

## Sub-Unit 4.2 & 4.3: Public Git Commit Auditing & Document Metadata (Exiftool)

Seemingly benign operational artifacts routinely leak critical internal topology and credential patterns:
- **Public Git Commit History**: Developers frequently commit `.env` files or AWS/SSH keys and then "delete" them in a later commit without rewriting Git history. Running `git log -p` or `trufflehog` exposes the historical diff.
- **Document Metadata (`exiftool`)**: Public PDF, DOCX, and XLSX brochures hosted on corporate websites embed the author's Active Directory username (revealing whether the enterprise uses `first.last`, `flast`, or `first_l`), internal printer/SMB UNC paths, and PDF producer software versions.
- **Job Postings & Shodan**: Technical job listings frequently reveal the exact EDR/SIEM stack (e.g., CrowdStrike Falcon, Splunk, Sentinel), while Shodan indexes exposed external banners and OT/IoT interfaces without active scanning.
