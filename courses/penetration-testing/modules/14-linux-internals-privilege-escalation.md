---
id: mod-pt-403
track_id: track-pentest
slug: linux-internals-privilege-escalation
title: '403: Linux Security Architecture & Local Privilege Analysis'
difficulty: Intermediate
order_index: 14
estimated_minutes: 40
lab_type: terminal
lab_briefing: Connect to target 192.168.1.9 (dmz-ignite-01). Audit the sudo configuration (sudo -l), discover the permissive LD_PRELOAD setting on the maintenance service, and execute the authorized audit verification to retrieve the root verification flag.
expected_flag: FLAG{LINUX_LD_PRELOAD_ROOT_ESCALATION}
hint: Execute sudo LD_PRELOAD=/opt/sec_audit/audit_hook.so /usr/sbin/apache2 -v to run the hook and capture the flag.
lab_config:
  target_ip: 192.168.1.9
  quick_commands:
    - id && uname -a
    - sudo -l
    - cat /etc/sudoers.d/audit_policy
    - sudo LD_PRELOAD=/opt/sec_audit/audit_hook.so /usr/sbin/apache2 -v
  commands:
    id && uname -a: |-
      uid=1001(www-data) gid=1001(www-data) groups=1001(www-data)
      Linux dmz-ignite-01 6.1.0-21-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.90-1 x86_64 GNU/Linux
    sudo -l: |-
      Matching Defaults entries for www-data on dmz-ignite-01:
          env_reset, env_keep+=LD_PRELOAD, mail_badpass

      User www-data may run the following commands on dmz-ignite-01:
          (root) NOPASSWD: /usr/sbin/apache2
    cat /etc/sudoers.d/audit_policy: |-
      # Maintenance override: allow www-data to restart web service with custom monitoring hook
      www-data ALL=(root) NOPASSWD: /usr/sbin/apache2
      Defaults:www-data env_keep += "LD_PRELOAD"
    sudo LD_PRELOAD=/opt/sec_audit/audit_hook.so /usr/sbin/apache2 -v: |-
      [+] Audit hook loaded into execution context: UID=0 (root)
      [+] Escalation Path Verified: LD_PRELOAD environment preservation
      FLAG{LINUX_LD_PRELOAD_ROOT_ESCALATION}
      Server version: Apache/2.4.57 (Debian)
---

# 403: Linux Security Architecture & Local Privilege Analysis

## Sub-Unit 12.1 & 12.2: Linux Sudo Rules, SUID Binaries & Shared Libraries

When conducting host configuration audits, administrators and penetration testers systematically evaluate privilege boundaries on Linux hosts:
- **Sudo Misconfigurations**: Inspecting `sudo -l` to identify programs that can be executed as root. If `env_keep+=LD_PRELOAD` is enabled, any shared library path can be injected before the binary runs.
- **SUID/SGID Binaries**: Identifying executables with the Set-UID bit set (`find / -perm -4000 2>/dev/null`) that permit unprivileged users to execute code in the owner's security context.
- **Linux File Capabilities**: Checking POSIX capabilities using `getcap -r / 2>/dev/null` (such as `cap_setuid+ep`), which grant specific root privileges without requiring full SUID flags.

## Sub-Unit 12.3: Process Timers, Cron Permissions & Path Hijacking

Automated scheduled tasks often run with elevated permissions:
- If a root cron job executes a script using a relative path or resides in a world-writable directory, an unprivileged user can modify the script or manipulate the `PATH` variable to achieve execution.
- Monitoring process execution with tools like `pspy` allows auditors to detect unprivileged cron jobs running periodically without requiring root permissions.
