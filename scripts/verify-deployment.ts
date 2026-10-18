/**
 * Phoenix Labs Academy — Automated Deployment, Cryptographic Auth & Contract Verification Suite
 *
 * Verifies:
 * 1. Zero placeholder emails, mock auth strings, or invalid D1 UUIDs in configuration and source files.
 * 2. Version synchronization across package.json, README.md, main.tsx, Navbar.tsx, and App.tsx.
 * 3. WebCrypto RS256 JWT cryptographic signature verification and tamper rejection.
 * 4. Hono Edge Worker API contract: 3 tracks, 26 modules, flag stripping, and telemetry persistence.
 */

import fs from 'node:fs';
import path from 'node:path';
import app from '../src/worker/index';
import {
  timingSafeEqualStrings,
  verifyCloudflareAccessJwt
} from '../src/worker/auth';

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function runVerificationSuite() {
  console.log('\n=== Phoenix Labs Academy: Automated Verification Suite ===\n');

  // ---------------------------------------------------------------------------
  // 1. Static Audit: Zero Placeholder Emails or Invalid D1 UUIDs
  // ---------------------------------------------------------------------------
  const filesToAudit = [
    'wrangler.toml',
    'package.json',
    'README.md',
    'src/worker/index.ts',
    'src/worker/auth.ts',
    'src/worker/db.ts',
    'src/worker/types.ts',
    'src/client/App.tsx',
    'src/client/api.ts',
    'src/client/main.tsx',
    'src/client/components/Navbar.tsx',
    'src/client/components/StudentProfile.tsx',
    'src/client/components/IngestionModal.tsx'
  ];

  const forbiddenPlaceholders = [
    'local-operator@localhost',
    'admin@phoenixlabs.io',
    'blackboxadmin@phoenixlabs.io',
    'your.email@phoenixlabs.io',
    'local-dev-db',
    'PASTE_YOUR_D1_UUID_HERE',
    '00000000-0000-0000-0000-000000000000',
    'mod-example-101'
  ];

  for (const relPath of filesToAudit) {
    const fullPath = path.resolve(process.cwd(), relPath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    for (const forbidden of forbiddenPlaceholders) {
      assert(
        !content.includes(forbidden),
        `Forbidden placeholder "${forbidden}" found in ${relPath}`
      );
    }
  }
  console.log('✓ [1/4] Static audit passed: Zero placeholder emails or bogus UUIDs in deployment files.');

  // ---------------------------------------------------------------------------
  // 2. Version Synchronization Audit
  // ---------------------------------------------------------------------------
  const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
  const expectedVersion = pkg.version;
  assert(expectedVersion === '1.2.1', `Expected package.json version 1.2.1, got ${expectedVersion}`);

  const readme = fs.readFileSync(path.resolve('README.md'), 'utf-8');
  const mainTsx = fs.readFileSync(path.resolve('src/client/main.tsx'), 'utf-8');
  const navbarTsx = fs.readFileSync(path.resolve('src/client/components/Navbar.tsx'), 'utf-8');
  const appTsx = fs.readFileSync(path.resolve('src/client/App.tsx'), 'utf-8');

  assert(
    readme.includes(`version-${expectedVersion}-acid--lime.svg`),
    `README.md badge does not match version ${expectedVersion}`
  );
  assert(
    mainTsx.includes(`appVersion: '${expectedVersion}'`),
    `src/client/main.tsx does not match version ${expectedVersion}`
  );
  assert(
    navbarTsx.includes(`appVersion = '${expectedVersion}'`),
    `src/client/components/Navbar.tsx does not match version ${expectedVersion}`
  );
  assert(
    appTsx.includes(`appVersion="${expectedVersion}"`),
    `src/client/App.tsx does not match version ${expectedVersion}`
  );
  console.log(`✓ [2/4] Version synchronization verified across all manifests and UI components (v${expectedVersion}).`);

  // ---------------------------------------------------------------------------
  // 3. Cryptographic RS256 JWT Verification & Tamper Rejection
  // ---------------------------------------------------------------------------
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['sign', 'verify']
  );

  const publicJwk = (await crypto.subtle.exportKey('jwk', keyPair.publicKey)) as any;
  publicJwk.kid = 'cf-access-key-1';
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';

  const nowSec = Math.floor(Date.now() / 1000);
  const jwtHeader = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ alg: 'RS256', kid: 'cf-access-key-1', typ: 'JWT' }))
  );
  const jwtPayload = toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        sub: 'usr-verified-01',
        email: 'operator.verified@corp.internal',
        aud: ['aud-tag-991'],
        iat: nowSec - 10,
        nbf: nowSec - 10,
        exp: nowSec + 3600
      })
    )
  );

  const signingInput = new TextEncoder().encode(`${jwtHeader}.${jwtPayload}`);
  const signatureBuf = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyPair.privateKey, signingInput);
  const validJwt = `${jwtHeader}.${jwtPayload}.${toBase64Url(new Uint8Array(signatureBuf))}`;

  const validResult = await verifyCloudflareAccessJwt(
    validJwt,
    'team.cloudflareaccess.com',
    'aud-tag-991',
    [publicJwk]
  );
  assert(validResult.valid === true, `Expected valid RS256 JWT to pass: ${validResult.reason}`);
  assert(
    validResult.email === 'operator.verified@corp.internal',
    'Expected verified email claim to match'
  );

  // Tamper with payload and verify cryptographic rejection
  const tamperedPayload = toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        sub: 'usr-verified-01',
        email: 'elevated@corp.internal',
        aud: ['aud-tag-991'],
        exp: nowSec + 3600
      })
    )
  );
  const forgedJwt = `${jwtHeader}.${tamperedPayload}.${toBase64Url(new Uint8Array(signatureBuf))}`;
  const forgedResult = await verifyCloudflareAccessJwt(
    forgedJwt,
    'team.cloudflareaccess.com',
    'aud-tag-991',
    [publicJwk]
  );
  assert(forgedResult.valid === false, 'Forged JWT payload must be cryptographically rejected');

  const tokenMatch = await timingSafeEqualStrings('secops-secret-991', 'secops-secret-991');
  const tokenMismatch = await timingSafeEqualStrings('secops-secret-991', 'secops-secret-992');
  assert(tokenMatch === true && tokenMismatch === false, 'Constant-time token comparison failed');
  console.log('✓ [3/4] WebCrypto RS256 JWT signature verification, tamper rejection, and timing-safe checks passed.');

  // ---------------------------------------------------------------------------
  // 4. Edge Worker API Contract & Self-Healing Curriculum Verification
  // ---------------------------------------------------------------------------
  const mockEnv = { ASSETS: { fetch: async () => new Response('ok') } } as any;
  const sessionHeaders = { 'X-Operator-Session': '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' };

  const currRes = await app.fetch(
    new Request('https://academy.edge/api/curriculum', { headers: sessionHeaders }),
    mockEnv
  );
  assert(currRes.status === 200, `Expected HTTP 200 from /api/curriculum, got ${currRes.status}`);
  const currData = (await currRes.json()) as any;

  assert(currData.tracks.length === 3, `Expected 3 tracks, got ${currData.tracks.length}`);
  assert(currData.modules.length === 26, `Expected 26 total modules, got ${currData.modules.length}`);
  assert(
    /^OP-[0-9A-F]{8}$/.test(currData.student.email),
    `Expected deterministic cryptographic session label OP-<8-HEX>, got "${currData.student.email}"`
  );

  const modRes = await app.fetch(
    new Request('https://academy.edge/api/modules/pre-enrollment-readiness-diagnostic', {
      headers: sessionHeaders
    }),
    mockEnv
  );
  assert(modRes.status === 200, 'Expected HTTP 200 from /api/modules/:slug');
  const modData = (await modRes.json()) as any;
  assert(modData.expected_flag === undefined, 'expected_flag must be stripped from client responses');
  assert(Array.isArray(modData.theory_sections) && modData.theory_sections.length > 0, 'Theory sections missing');

  const badVerifyRes = await app.fetch(
    new Request('https://academy.edge/api/modules/mod-pt-001/verify', {
      method: 'POST',
      headers: { ...sessionHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission: 'FLAG{WRONG_SUBMISSION}' })
    }),
    mockEnv
  );
  const badVerifyData = (await badVerifyRes.json()) as any;
  assert(badVerifyData.correct === false, 'Expected invalid module flag submission to be rejected');

  const verifyRes = await app.fetch(
    new Request('https://academy.edge/api/modules/mod-pt-001/verify', {
      method: 'POST',
      headers: { ...sessionHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission: 'FLAG{SYSADMIN_BASELINE_DIAGNOSTIC_PASSED}' })
    }),
    mockEnv
  );
  const verifyData = (await verifyRes.json()) as any;
  assert(verifyData.correct === true, 'Expected valid module flag verification to succeed');

  const profileRes = await app.fetch(
    new Request('https://academy.edge/api/student/profile', { headers: sessionHeaders }),
    mockEnv
  );
  const profileData = (await profileRes.json()) as any;
  assert(
    profileData.overview.completed_modules === 1,
    `Expected completed_modules === 1, got ${profileData.overview.completed_modules}`
  );
  console.log('✓ [4/4] Edge Worker API contract verified (3 tracks, 26 modules, flag isolation, and telemetry).');

  console.log('\n🎉 ALL DEPLOYMENT & SECURITY VERIFICATION CHECKS PASSED!\n');
}

runVerificationSuite().catch((err) => {
  console.error('\n✗ VERIFICATION FAILED:', err.message);
  process.exit(1);
});
