---
id: mod-pt-502
track_id: track-pentest
slug: active-directory-enumeration-bloodhound-graphs
title: '502: Active Directory Enumeration, Password Policies & BloodHound Graphing'
difficulty: Advanced
order_index: 18
estimated_minutes: 40
lab_type: terminal
lab_briefing: 'Over the internal ligolo tunnel to the GOAD domain controller (172.16.50.12, essos.local): (1) Verify the domain password policy to confirm the 5-attempt account lockout threshold, (2) run bloodhound-python collection, and (3) query the graph to identify the vulnerable ACL path leading to the Night Watch group and service flag.'
expected_flag: FLAG{BLOODHOUND_GOAD_NIGHTWATCH_ACL_PATH}
hint: Query the BloodHound graph output using python3 query_graph.py to reveal FLAG{BLOODHOUND_GOAD_NIGHTWATCH_ACL_PATH}.
lab_config:
  target_ip: 172.16.50.12 (dc02.essos.local)
  quick_commands:
    - nxc smb 172.16.50.12 --pass-pol
    - bloodhound-python -u jorah.mormont -p "H0n0r!" -d essos.local -ns 172.16.50.12 -c All --zip
    - python3 query_graph.py --zip *_bloodhound.zip --source "samwell.tarly" --target "Domain Admins"
  commands:
    nxc smb 172.16.50.12 --pass-pol: |-
      SMB         172.16.50.12    445    DC02             [*] Windows 10 / Server 2019 Build 17763 (name:DC02) (domain:essos.local)
      SMB         172.16.50.12    445    DC02             [+] Password Policy:
      SMB         172.16.50.12    445    DC02             [+]   Minimum Password Length: 5
      SMB         172.16.50.12    445    DC02             [+]   Account Lockout Threshold: 5 attempts
      SMB         172.16.50.12    445    DC02             [+]   Reset Lockout Counter After: 5 minutes
    bloodhound-python -u jorah.mormont -p "H0n0r!" -d essos.local -ns 172.16.50.12 -c All --zip: |-
      INFO: Found AD domain: essos.local
      INFO: Connecting to LDAP server: 172.16.50.12
      INFO: Found 12 users, 8 groups, 4 computers, 2 trusts
      INFO: Compressing data to 20261017_bloodhound.zip
    python3 query_graph.py --zip *_bloodhound.zip --source "samwell.tarly" --target "Domain Admins": |-
      [+] Shortest Attack Path Discovered:
          (samwell.tarly) -[MemberOf]-> (Night Watch)
          (Night Watch) -[GenericAll]-> (mssql_svc)
          (mssql_svc) -[AdminTo]-> (DC02.ESSOS.LOCAL)
      [+] Verification Finding Flag: FLAG{BLOODHOUND_GOAD_NIGHTWATCH_ACL_PATH}
---

# 502: Active Directory Enumeration, Password Policies & BloodHound Graphing

## Sub-Unit 15.1 & 15.2: Safe Domain Enumeration & Account Lockout Awareness

When enumerating Active Directory domains (such as Game of Active Directory / GOAD environments):
1. **Never spray passwords before checking lockout policies**: Always query domain password policy via LDAP or NetExec first (`nxc smb <DC_IP> --pass-pol`). If the lockout threshold is 5 attempts in a 5-minute observation window, an unthrottled brute-force attempt will lock out administrative users and fail your assessment.
2. **Low-Footprint Legacy Enumeration**: Using native Windows commands (`net user /domain`, `nltest /domain_trusts`, `dsquery`) minimizes detection compared to dropping noisy third-party binaries.

## Sub-Unit 15.3: Graph-Based Attack Path Mapping with BloodHound

**BloodHound** and **SharpHound** utilize graph theory to map transitive relationships in Active Directory:
- **High-Value Object Edges**: Analyzing Access Control Entries (ACEs) such as `GenericAll`, `WriteDacl`, `ForceChangePassword`, and `AddMember`.
- **Transitive Group Nesting**: Identifying how membership in a tier-2 operations group grants indirect control over domain administrative assets.
- **Cross-Domain Trusts**: Mapping parent-child domain trust relationships to locate paths across forest boundaries.
