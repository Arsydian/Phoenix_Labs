---
id: mod-pt-102
track_id: track-pentest
slug: offensive-linux-cli-stream-mastery
title: '102: Offensive Linux Architecture & High-Velocity CLI Stream Mastery'
difficulty: Fundamentals
order_index: 3
estimated_minutes: 30
lab_type: terminal
lab_briefing: You are connected to assessment jump host 10.10.14.10 containing a 500 MB multi-protocol proxy and firewall debug bundle (/var/log/enterprise_proxy.log). Execute the CLI stream pipelines to (1) extract unique internal /24 hosts communicating on non-standard port 8443, (2) isolate and Base64-decode the leaked administrative API token from the log stream, and (3) verify the encrypted socat TLS listener capture.
expected_flag: FLAG{CLI_STREAM_REGEX_SOCAT_MASTER}
hint: Run the grep -oP pipeline piped to base64 -d (Step 3) or the socat listener (Step 4) to reveal FLAG{CLI_STREAM_REGEX_SOCAT_MASTER}.
lab_config:
  target_ip: 10.10.14.10
  quick_commands:
    - awk '$6 == "8443" {print $3}' /var/log/enterprise_proxy.log | cut -d'.' -f1-3 | sort -u -c
    - 'grep -oP ''(?<=X-Admin-Token: )[A-Za-z0-9+/=]+'' /var/log/enterprise_proxy.log | head -n 1'
    - 'grep -oP ''(?<=X-Admin-Token: )[A-Za-z0-9+/=]+'' /var/log/enterprise_proxy.log | head -n 1 | base64 -d'
    - socat OPENSSL-LISTEN:4443,cert=operator.pem,verify=0 STDOUT
  commands:
    awk '$6 == "8443" {print $3}' /var/log/enterprise_proxy.log | cut -d'.' -f1-3 | sort -u -c: |2-
         1428 172.16.50
          319 192.168.147
           84 10.20.99
    'grep -oP ''(?<=X-Admin-Token: )[A-Za-z0-9+/=]+'' /var/log/enterprise_proxy.log | head -n 1': RkxBR3tDTElfU1RSRUFNX1JFR0VYX1NPQ0FUX01BU1RFUn0K
    'grep -oP ''(?<=X-Admin-Token: )[A-Za-z0-9+/=]+'' /var/log/enterprise_proxy.log | head -n 1 | base64 -d': FLAG{CLI_STREAM_REGEX_SOCAT_MASTER}
    socat OPENSSL-LISTEN:4443,cert=operator.pem,verify=0 STDOUT: |-
      [+] OpenSSL TLS 1.3 Listener bound on 0.0.0.0:4443
      [+] Connection received from 192.168.147.135:51922 (Cipher: TLS_AES_256_GCM_SHA384)
      root@dmz-relay:~# cat /etc/socat_verify.flag
      FLAG{CLI_STREAM_REGEX_SOCAT_MASTER}
---

# 102: Offensive Linux Architecture & High-Velocity CLI Stream Mastery

## Sub-Unit 2.1: Kali Linux Offensive Hierarchy & Network Stack Tuning

While systems administrators use Linux for service stability, penetration testers use Kali Linux as a high-speed data-extraction and exploitation workbench. Key directories every operator must navigate by muscle memory include:
- `/usr/share/wordlists/`: Houses `rockyou.txt`, `seclists` (Discovery, Fuzzing, Passwords, Web-Shells), and `dirb`/`wfuzz` lists.
- `/usr/share/nmap/scripts/`: Over 600 NSE (`.nse`) scripts for vulnerability verification and protocol enumeration.
- `/usr/share/exploitdb/`: Offline mirror of Exploit-DB queried via `searchsploit`.
- `/opt/`: Standard staging location for third-party offensive repositories (`ligolo-ng`, `BloodHound`, `LinPEAS`, `Certipy`).

Before scanning, always verify your VPN tunnel interface (`ip -br a show tun0`) and ensure session logging is active via `tmux` or `script -a engagement.log`.

## Sub-Unit 2.2: High-Velocity Stream Processing (grep, awk, sed, cut, tr)

During timed engagements (OSCP+ / CPTS), manually reading 500 MB of web proxy logs, Nmap greppable (`-oG`) dumps, or zone transfers wastes hours. You must chain standard streams (`stdin`, `stdout`, `stderr`) with Perl-compatible regular expressions:

```bash
grep -oP '(?<=api_token=)[A-Za-z0-9+/=]+' /var/log/proxy_dump.log | sort -u | base64 -d
```

| CLI Utility | Offensive Stream Use Case | Example Syntax |
| --- | --- | --- |
| `grep -oP` | Extract only the matching regex group (IPs, tokens, subdomains) | `grep -oP '(\d{1,3}\.){3}\d{1,3}' scan.gnmap` |
| `awk` | Field extraction and conditional filtering on structured dumps | `awk '/Up$/{print $2}' sweep.gnmap` |
| `cut & sort -u` | Isolate delimiter fields and deduplicate discovered assets | `cut -d':' -f1 creds.txt \| sort -u` |
| `sed & tr` | In-place payload mutation or stripping bad characters | `sed 's/http:/https:/g' urls.txt` |

## Sub-Unit 2.3: Offensive Swiss-Army Utilities (Netcat, Socat & Powercat)

When establishing interactive shells across segmented networks, understanding raw socket utilities is vital:
- **Netcat (`nc -lvnp 4444`)**: Standard unencrypted TCP/UDP listener and banner grabber.
- **Socat**: Supports full PTY allocation and **OpenSSL TLS-encrypted reverse shells**, evading cleartext Deep Packet Inspection (DPI) firewalls:
```bash
socat OPENSSL-LISTEN:4443,cert=shell.pem,verify=0,fork STDOUT
```
- **Powercat (`powercat.ps1`)**: Native PowerShell implementation of Netcat enabling Windows-to-Linux shell bridging and TCP relays without dropping compiled binaries.
