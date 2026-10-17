---
id: mod-pt-202
track_id: track-pentest
slug: active-network-discovery-service-enumeration
title: '202: Active Network Discovery, Service Enumeration & OT/IoT Sniffing'
difficulty: Intermediate
order_index: 6
estimated_minutes: 35
lab_type: terminal
lab_briefing: Enforce the "Enumerate Before Exploit" protocol against target 10.10.14.22 and the captured OT/IoT network trace (ot_telemetry.pcap). Fingerprint open TCP/UDP services, execute a DNS Zone Transfer (dig axfr) to uncover hidden subdomains, walk the SNMP MIB tree, inspect the anonymous SMB dev-staging share, and extract the cleartext MQTT OT broker flag from ot_telemetry.pcap.
expected_flag: FLAG{ENUMERATE_BEFORE_EXPLOIT_OT_MQTT}
hint: Complete the 4-step enumeration chain ending with the tshark MQTT CONNECT packet inspection to extract FLAG{ENUMERATE_BEFORE_EXPLOIT_OT_MQTT}.
lab_config:
  target_ip: 10.10.14.22
  quick_commands:
    - nmap -sV -sC -p 53,139,445,1883,2049 10.10.14.22
    - dig axfr @10.10.14.22 corp.megacorp.local
    - smbclient //10.10.14.22/dev-staging -N -c "get deploy.env -"
    - tshark -r ot_telemetry.pcap -Y "mqtt.msgtype == 1" -T fields -e mqtt.clientid -e mqtt.username -e mqtt.passwd
  commands:
    nmap -sV -sC -p 53,139,445,1883,2049 10.10.14.22: |-
      PORT     STATE SERVICE      VERSION
      53/tcp   open  domain       ISC BIND 9.18.24 (Zone Transfer Allowed)
      445/tcp  open  microsoft-ds Samba smbd 4.17.12-Debian (guest/null session allowed)
      1883/tcp open  mqtt         Mosquitto MQTT Broker 2.0.18
      2049/tcp open  nfs          3-4 (RPC #100003) /mnt/staging (no_root_squash)
    dig axfr @10.10.14.22 corp.megacorp.local: |-
      ; <<>> DiG 9.18.24 <<>> axfr @10.10.14.22 corp.megacorp.local
      corp.megacorp.local. 3600 IN SOA ns1.corp.megacorp.local. admin.corp.megacorp.local. 2026101701 3600 900 604800 86400
      ns1.corp.megacorp.local. 3600 IN A 10.10.14.22
      scada-mqtt-gw.corp.megacorp.local. 3600 IN A 10.10.14.22
      dc-vault.corp.megacorp.local. 3600 IN A 172.16.60.10
      ; Zone transfer complete (4 records).
    smbclient //10.10.14.22/dev-staging -N -c "get deploy.env -": |-
      Anonymous login successful
      # Staging Note: OT MQTT Broker traffic captured in ot_telemetry.pcap
      SMB_AUDIT=PASSED
      NEXT_STEP=Inspect_MQTT_CONNECT_Frame_In_ot_telemetry.pcap
    tshark -r ot_telemetry.pcap -Y "mqtt.msgtype == 1" -T fields -e mqtt.clientid -e mqtt.username -e mqtt.passwd: "scada-plc-controller-01\tot_admin\tFLAG{ENUMERATE_BEFORE_EXPLOIT_OT_MQTT}"
---

# 202: Active Network Discovery, Service Enumeration & OT/IoT Sniffing

## Sub-Unit 5.1: The "Enumerate Before Exploit" Gate & Nmap Tuning

The #1 cause of candidate failure in practical assessments (OSCP+ and HTB CPTS) is jumping on the first open port and trying to force an exploit while missing a trivial misconfiguration on a secondary TCP/UDP port.

**You cannot exploit a service you never found.** Always run a two-stage discovery workflow:
1. Fast all-port sweep (`nmap -p- --min-rate 1500 -T4 <IP>` or `masscan`) to identify non-standard ports.
2. Targeted version and default-script interrogation (`nmap -sV -sC -p <ports> <IP> -oA host_scan`) plus UDP top-port verification (`nmap -sU --top-ports 20 <IP>`) for DNS (53), TFTP (69), and SNMP (161).

## Sub-Unit 5.2 & 5.3: Systematic Protocol Checklists & OT/IoT Sniffing

Every discovered service must be audited against your personal protocol checklist:

| Port / Protocol | Mandatory Enumeration Verification | Key CLI Tooling |
| --- | --- | --- |
| **DNS (53 TCP/UDP)** | Query authoritative NS and test Zone Transfers (`AXFR`) to dump internal hostnames | `dig axfr @<IP> <domain>` |
| **SMB (139/445 TCP)** | Check Null Sessions (`-N`), Guest login, SMB signing status, and share permissions | `smbclient -L //<IP> -N`, `nxc smb <IP>` |
| **SNMP (161 UDP)** | Brute-force `public`/`private` community strings and walk the MIB process/interface tree | `snmpwalk -v2c -c public <IP>` |
| **NFS (2049 TCP)** | List exported mounts and check `no_root_squash` for root SUID planting | `showmount -e <IP>` |
| **OT / IoT (1883 MQTT / 502 Modbus)** | Inspect network PCAP captures for cleartext MQTT broker credentials or unauthenticated topics | `tshark -r capture.pcap -Y "mqtt"` |
