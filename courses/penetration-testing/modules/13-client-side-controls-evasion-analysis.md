---
id: mod-pt-402
track_id: track-pentest
slug: client-side-controls-evasion-analysis
title: '402: Client-Side Security Controls & Endpoint Telemetry Analysis'
difficulty: Intermediate
order_index: 13
estimated_minutes: 35
lab_type: hex_inspector
lab_briefing: Inspect the static analysis, sandbox detonation trace, and remediation rule for the staging helper artifact. Identify the internal verification token recorded during sandbox execution.
expected_flag: FLAG{LIBRARY_MS_WEBDAV_EDR_EVASION}
hint: Check the Strings or Blast Chamber Detonation tab to retrieve FLAG{LIBRARY_MS_WEBDAV_EDR_EVASION}.
lab_config:
  sample_name: 'stage2_test_runner.exe (SHA256: 4b2100...df)'
  entropy: 6.71 (Obfuscated Config Block)
  imports:
    - KERNEL32.dll!LoadLibraryA
    - WININET.dll!InternetOpenA
  strings:
    - WebDAV Staging Simulation
    - 'Telemetry Verification: FLAG{LIBRARY_MS_WEBDAV_EDR_EVASION}'
    - C2 Audit Mode Enabled
  sandbox_trace: |-
    [00:00.05] Process spawned: stage2_test_runner.exe
    [00:00.12] Telemetry event captured: FLAG{LIBRARY_MS_WEBDAV_EDR_EVASION}
    [00:00.20] Memory mapped safely without endpoint alert
  decompiled_c: |-
    // Diagnostic Staging Simulation
    void verify_telemetry() {
      const char *token = "FLAG{LIBRARY_MS_WEBDAV_EDR_EVASION}";
    }
  remediation_yara: |-
    rule Detect_Staging_Telemetry {
      strings:
        $tok = "FLAG{LIBRARY_MS_WEBDAV_EDR_EVASION}"
      condition:
        $tok
    }
---

# 402: Client-Side Security Controls & Endpoint Telemetry Analysis

## Sub-Unit 11.1: Client-Side Architecture and File Delivery Methods

Modern defensive perimeters inspect incoming attachments through mail gateways and Mark-of-the-Web (MotW) telemetry. Security auditors study how legacy Windows shortcuts, WebDAV shares, and containerized documents behave:
- **Windows Library Files (`.Library-ms`)**: XML-based configuration files that connect a local Explorer view to a remote network location.
- **Living-off-the-Land Binaries (LOLBins)**: Administrative binaries already present on Windows systems (e.g., `certutil.exe`, `bitsadmin.exe`, `curl.exe`) that can be abused for unauthorized file staging.

## Sub-Unit 11.2: Endpoint Detection and Response (EDR) Mechanisms

Endpoint protection agents combine multiple defensive telemetry layers:
1. **Static Signatures**: Detecting known malicious file hashes and known string patterns.
2. **Behavioral Heuristics**: Flagging suspicious parent-child process relationships (such as office productivity software spawning command interpreters).
3. **API Hooking**: Injecting monitoring hooks into user-space `ntdll.dll` routines to observe system calls in real time.
Understanding these controls helps penetration testers design realistic simulation assessments and advise enterprise defenders on robust detection rules.
