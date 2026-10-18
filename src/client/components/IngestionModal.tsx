import React, { useState } from 'react';
import jsYaml from 'js-yaml';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { apiFetch } from '../api';

interface IngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModuleIngested: () => void;
}

export const IngestionModal: React.FC<IngestionModalProps> = ({
  isOpen,
  onClose,
  onModuleIngested
}) => {
  const [format, setFormat] = useState<'json' | 'markdown'>('json');
  const [payloadText, setPayloadText] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const loadSampleJson = () => {
    setFormat('json');
    const sample = {
      id: 'mod-mw-301',
      track_id: 'track-malware',
      slug: 'api-hashing-dynamic-resolution',
      title: '301: Defeating Dynamic API Hashing (ROR13)',
      difficulty: 'Intermediate',
      order_index: 3,
      estimated_minutes: 30,
      theory_sections: [
        {
          heading: 'Why Advanced Malware Hides the IAT',
          body: 'When malware authors want to prevent static IAT inspection, they walk the Process Environment Block (PEB) in assembly to locate kernel32.dll export tables, compute ROR13 hashes of exported symbols, and resolve addresses at runtime.'
        }
      ],
      lab_type: 'hex_inspector',
      lab_briefing: 'Inspect the resolved ROR13 hash table in the Decompiled RE tab and submit the Win32 API name resolved for hash 0x0726774C.',
      lab_config: {
        sample_name: 'stage3_reflective.bin (SHA256: 7e2b1099f...)',
        entropy: '7.81 (Reflective Loader)',
        imports: ['KERNEL32.dll!LoadLibraryA (Only 1 import visible in IAT)'],
        strings: ['No cleartext Win32 network API strings found in binary'],
        sandbox_trace: '[00:00.15] PEB Walk detected -> kernel32.dll export table\n[00:00.22] Resolved ROR13 Hash 0x0726774C -> InternetOpenA\n[00:00.31] Socket initialized via resolved pointer',
        decompiled_c: '// Dynamic API Resolution via PEB + ROR13\nLPVOID api = ResolveApiByHash(0x0726774C); // Resolves to InternetOpenA\n((InternetOpenA_t)api)("Mozilla/5.0", 0, NULL, NULL, 0);',
        remediation_yara: 'rule Reflective_ROR13_Loader {\n  meta:\n    description = "Detects ROR13 PEB walker"\n  condition:\n    uint16(0) == 0x5A4D\n}'
      },
      expected_flag: 'InternetOpenA',
      hint: 'Look at the resolved function name for hash 0x0726774C in the Blast Chamber trace or Decompiled C tab.'
    };
    setPayloadText(JSON.stringify(sample, null, 2));
    setStatusMessage(null);
  };

  const loadSampleMarkdown = () => {
    setFormat('markdown');
    const sampleMd = `---
id: mod-pt-301
track_id: track-pentest
slug: active-directory-kerberoasting
title: "301: Offline Kerberos Ticket Decryption (Kerberoasting)"
difficulty: Intermediate
order_index: 3
estimated_minutes: 35
lab_type: terminal
lab_briefing: "Request a Service Principal Name (SPN) ticket for mssql_svc and crack the RC4 ticket hash to reveal the plaintext service account password."
expected_flag: "FLAG{Summer2026!Password}"
hint: "Run GetUserSPNs.py followed by john --format=krb5tgs."
lab_config:
  target_ip: "10.10.14.200"
  quick_commands:
    - "GetUserSPNs.py corp.local/jdoe:Password123 -dc-ip 10.10.14.200 -request"
    - "john --format=krb5tgs --wordlist=rockyou.txt hashes.kerberoast"
  commands:
    "GetUserSPNs.py corp.local/jdoe:Password123 -dc-ip 10.10.14.200 -request": "ServicePrincipalName: MSSQLSvc/db01.corp.local:1433\\nHash: $krb5tgs$23$*mssql_svc$CORP.LOCAL*$...[TICKET HASH STORED IN hashes.kerberoast]"
    "john --format=krb5tgs --wordlist=rockyou.txt hashes.kerberoast": "Loaded 1 password hash (krb5tgs)\\nSummer2026!Password (mssql_svc)\\n\\n1 password hash cracked."
---

# Kerberoasting Fundamentals
Kerberoasting exploits legitimate Active Directory architecture: any authenticated domain user can request a Kerberos TGS service ticket for any service account with a registered SPN.

## Why Active Directory Allows This
Because the domain controller encrypts the ticket using the target service account's NTLM password hash, the requesting user can extract the ticket and conduct offline dictionary attacks without generating lockout events on the domain controller.
`;
    setPayloadText(sampleMd);
    setStatusMessage(null);
  };

  const parseMarkdownPayload = (rawMd: string) => {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = rawMd.match(frontmatterRegex);

    if (!match) {
      throw new Error('Markdown missing standard YAML frontmatter between --- delimiters.');
    }

    const frontmatter = jsYaml.load(match[1]) as Record<string, any>;
    const bodyContent = match[2].trim();

    const rawSections = bodyContent.split(/^##?\s+/m).filter(Boolean);
    const theory_sections = rawSections.map((sec) => {
      const firstLineBreak = sec.indexOf('\n');
      if (firstLineBreak === -1) {
        return { heading: sec.trim(), body: '' };
      }
      return {
        heading: sec.slice(0, firstLineBreak).trim(),
        body: sec.slice(firstLineBreak + 1).trim()
      };
    });

    return {
      id: frontmatter.id,
      track_id: frontmatter.track_id,
      slug: frontmatter.slug,
      title: frontmatter.title,
      difficulty: frontmatter.difficulty || 'Intermediate',
      order_index: frontmatter.order_index || 10,
      estimated_minutes: frontmatter.estimated_minutes || 25,
      theory_sections: theory_sections.length > 0 ? theory_sections : [{ heading: 'Theory', body: bodyContent }],
      lab_type: frontmatter.lab_type,
      lab_briefing: frontmatter.lab_briefing || '',
      lab_config: frontmatter.lab_config || {},
      expected_flag: frontmatter.expected_flag,
      hint: frontmatter.hint || ''
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payloadText.trim()) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      let finalPayload: any;

      if (format === 'json') {
        finalPayload = JSON.parse(payloadText);
      } else {
        finalPayload = parseMarkdownPayload(payloadText);
      }

      const res = await apiFetch('/api/admin/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to ingest module into Cloudflare D1.');
      }

      setStatusMessage({
        type: 'success',
        text: data.bundle
          ? `Course Bundle (${data.modules_ingested} modules) successfully ingested into Cloudflare D1!`
          : `Module "${finalPayload.title}" (${finalPayload.id}) successfully ingested into Cloudflare D1!`
      });
      onModuleIngested();
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Invalid payload format.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#08090a]/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f1011] border border-[#23252a] rounded-[12px] max-w-3xl w-full p-6 space-y-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#23252a]">
          <div>
            <h3 className="text-base font-medium text-[#ffffff] flex items-center gap-2 tracking-tight">
              <UploadCloud className="w-5 h-5 text-[#e4f222]" />
              <span>Ingest Course Material</span>
            </h3>
            <p className="text-xs text-[#8a8f98] mt-0.5">
              Paste a full Course Bundle JSON, single Module JSON, or Markdown with Frontmatter to hot-load into Cloudflare D1.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8a8f98] hover:text-[#ffffff] p-1 rounded-[6px] hover:bg-[#161718] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selectors and Sample Loaders */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 bg-[#161718] p-1 rounded-[6px] border border-[#23252a] text-xs">
            <button
              type="button"
              onClick={() => setFormat('json')}
              className={`px-3 py-1 rounded-[4px] transition ${
                format === 'json'
                  ? 'bg-[#23252a] text-[#ffffff] font-medium shadow-xs'
                  : 'text-[#8a8f98] hover:text-[#ffffff]'
              }`}
            >
              JSON Payload
            </button>
            <button
              type="button"
              onClick={() => setFormat('markdown')}
              className={`px-3 py-1 rounded-[4px] transition ${
                format === 'markdown'
                  ? 'bg-[#23252a] text-[#ffffff] font-medium shadow-xs'
                  : 'text-[#8a8f98] hover:text-[#ffffff]'
              }`}
            >
              Markdown with YAML
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadSampleJson}
              className="text-xs bg-[#161718] hover:bg-[#23252a] text-[#d0d6e0] border border-[#23252a] px-2.5 py-1 rounded-[6px] transition shadow-xs"
            >
              Load Template JSON (Malware 301)
            </button>
            <button
              type="button"
              onClick={loadSampleMarkdown}
              className="text-xs bg-[#161718] hover:bg-[#23252a] text-[#d0d6e0] border border-[#23252a] px-2.5 py-1 rounded-[6px] transition shadow-xs"
            >
              Load Template Markdown (Pentest 301)
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            rows={12}
            placeholder={
              format === 'json'
                ? '{\n  "id": "mod-pt-701",\n  "track_id": "track-pentest",\n  "slug": "module-slug",\n  "title": "Module Title",\n  "lab_type": "terminal",\n  "expected_flag": "FLAG{...}"\n}'
                : '---\nid: mod-pt-701\ntrack_id: track-pentest\nslug: module-slug\ntitle: "Module Title"\nlab_type: terminal\nexpected_flag: "FLAG{...}"\n---\n# Section Heading\nSection content...'
            }
            className="w-full bg-[#08090a] border border-[#23252a] rounded-[6px] p-3 font-mono text-xs text-[#d0d6e0] focus:outline-none focus:border-[#383b3f]"
          />

          {statusMessage && (
            <div
              className={`p-3 rounded-[6px] text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-[#27a644]/10 border border-[#27a644]/30 text-[#27a644]'
                  : 'bg-[#eb5757]/10 border border-[#eb5757]/30 text-[#eb5757]'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#27a644]" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-[#eb5757]" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#23252a]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[6px] text-xs text-[#8a8f98] hover:text-[#ffffff] hover:bg-[#161718] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !payloadText.trim()}
              className={`px-5 py-2 rounded-[6px] text-xs font-medium transition ${
                loading || !payloadText.trim()
                  ? 'bg-[#161718] text-[#62666d] cursor-not-allowed border border-[#23252a]'
                  : 'bg-[#e4f222] hover:bg-[#d4e21a] text-[#08090a] shadow-xs'
              }`}
            >
              {loading ? 'Ingesting...' : 'Ingest to Cloudflare D1'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
