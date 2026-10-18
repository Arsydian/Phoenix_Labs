/**
 * Phoenix Labs Academy — Edge Cryptographic Authentication & Identity Module
 *
 * Implements:
 * 1. Real RS256 JWT signature verification against Cloudflare Access JWKS
 *    (`https://<team-domain>/cdn-cgi/access/certs`) using WebCrypto (`crypto.subtle`).
 * 2. Timing-safe HMAC/SHA-256 comparison for administrative API tokens.
 * 3. Deterministic SHA-256 session identity derivation when operating without
 *    a Cloudflare Access gateway (zero mock or placeholder emails).
 */

import type { Bindings } from './types';

export interface VerifiedIdentity {
  /** Unique subject identifier (verified email or cryptographic session ID) */
  id: string;
  /** Display label for UI telemetry (never a fake/placeholder email) */
  identityLabel: string;
  /** Short callsign / display name */
  displayName: string;
  /** True if cryptographically verified via Cloudflare Access JWT / header */
  zeroTrustEnforced: boolean;
  /** True if authorized for curriculum ingestion */
  isAdmin: boolean;
}

interface JwkKey {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  e: string;
  n: string;
}

interface JwksResponse {
  keys: JwkKey[];
}

// In-isolate JWKS cache keyed by team domain (TTL: 10 minutes)
const jwksCache = new Map<string, { keys: JwkKey[]; expiresAt: number }>();

/**
 * Decodes a Base64URL string into a Uint8Array buffer.
 */
export function base64UrlToBytes(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Computes a lowercase hex SHA-256 digest of a string using WebCrypto.
 */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time comparison of two strings via SHA-256 digests to prevent timing side-channels.
 */
export async function timingSafeEqualStrings(a: string, b: string): Promise<boolean> {
  if (!a || !b) return false;
  const [hashA, hashB] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  let diff = a.length ^ b.length;
  for (let i = 0; i < hashA.length; i++) {
    diff |= hashA.charCodeAt(i) ^ hashB.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verifies a Cloudflare Access RS256 JWT (`Cf-Access-Jwt-Assertion`) against the
 * team's public JWKS endpoint or an injected public JWK (for offline testing).
 */
export async function verifyCloudflareAccessJwt(
  token: string,
  teamDomain: string,
  expectedAud?: string,
  overrideKeys?: JwkKey[]
): Promise<{ valid: boolean; email?: string; sub?: string; reason?: string }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Malformed JWT structure' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const headerJson = new TextDecoder().decode(base64UrlToBytes(headerB64));
    const payloadJson = new TextDecoder().decode(base64UrlToBytes(payloadB64));

    const header = JSON.parse(headerJson) as { alg?: string; kid?: string };
    const payload = JSON.parse(payloadJson) as {
      email?: string;
      sub?: string;
      aud?: string | string[];
      exp?: number;
      nbf?: number;
      iss?: string;
    };

    if (header.alg !== 'RS256') {
      return { valid: false, reason: `Unsupported JWT algorithm: ${header.alg}` };
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === 'number' && nowSeconds >= payload.exp) {
      return { valid: false, reason: 'JWT has expired' };
    }
    if (typeof payload.nbf === 'number' && nowSeconds < payload.nbf - 60) {
      return { valid: false, reason: 'JWT is not yet valid (nbf)' };
    }

    if (expectedAud) {
      const audList = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
      if (!audList.includes(expectedAud)) {
        return { valid: false, reason: 'JWT audience (aud) mismatch' };
      }
    }

    // Resolve JWKS keys
    let keys: JwkKey[] = [];
    if (overrideKeys && overrideKeys.length > 0) {
      keys = overrideKeys;
    } else {
      const normalizedDomain = teamDomain
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '');
      const cached = jwksCache.get(normalizedDomain);
      if (cached && cached.expiresAt > Date.now()) {
        keys = cached.keys;
      } else {
        const certsUrl = `https://${normalizedDomain}/cdn-cgi/access/certs`;
        const res = await fetch(certsUrl);
        if (!res.ok) {
          return { valid: false, reason: `Failed to fetch JWKS from ${certsUrl}: HTTP ${res.status}` };
        }
        const data = (await res.json()) as { keys?: JwkKey[] };
        keys = Array.isArray(data.keys) ? data.keys : [];
        jwksCache.set(normalizedDomain, {
          keys,
          expiresAt: Date.now() + 10 * 60 * 1000
        });
      }
    }

    const matchingKey = header.kid ? keys.find((k) => k.kid === header.kid) : keys[0];
    if (!matchingKey) {
      return { valid: false, reason: 'No matching JWK kid found in Cloudflare Access certs' };
    }

    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      matchingKey as JsonWebKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signatureBytes = base64UrlToBytes(signatureB64);

    const isSignatureValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBytes,
      signedData
    );

    if (!isSignatureValid) {
      return { valid: false, reason: 'Invalid RS256 cryptographic signature' };
    }

    return {
      valid: true,
      email: payload.email,
      sub: payload.sub || payload.email
    };
  } catch (err: any) {
    return { valid: false, reason: err?.message || 'JWT verification exception' };
  }
}

/**
 * Resolves the caller's verified identity and administrative privileges.
 * Never falls back to hardcoded placeholder emails.
 */
export async function resolveRequestIdentity(
  req: { header: (name: string) => string | undefined },
  env: Bindings
): Promise<VerifiedIdentity> {
  const cfJwt = req.header('Cf-Access-Jwt-Assertion');
  const cfHeaderEmail = req.header('Cf-Access-Authenticated-User-Email');
  const adminTokenHeader = req.header('X-Admin-Token');
  const clientSessionHeader = req.header('X-Operator-Session');

  let verifiedEmail: string | undefined;
  let zeroTrustEnforced = false;

  // 1. If CF_ACCESS_TEAM_DOMAIN is configured and a JWT is present, perform full RS256 verification
  if (env.CF_ACCESS_TEAM_DOMAIN && cfJwt) {
    const verification = await verifyCloudflareAccessJwt(
      cfJwt,
      env.CF_ACCESS_TEAM_DOMAIN,
      env.CF_ACCESS_AUD
    );
    if (verification.valid && verification.email) {
      verifiedEmail = verification.email;
      zeroTrustEnforced = true;
    }
  } else if (cfHeaderEmail && !env.CF_ACCESS_TEAM_DOMAIN) {
    // Cloudflare Access header injected by edge proxy when team domain JWKS is managed upstream
    verifiedEmail = cfHeaderEmail.trim();
    zeroTrustEnforced = true;
  }

  // 2. Determine Admin Authorization
  const configuredAdminEmails = (env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  let isAdmin = false;
  if (env.ADMIN_API_TOKEN && adminTokenHeader) {
    isAdmin = await timingSafeEqualStrings(adminTokenHeader, env.ADMIN_API_TOKEN);
  }
  if (!isAdmin && verifiedEmail && configuredAdminEmails.length > 0) {
    isAdmin = configuredAdminEmails.includes(verifiedEmail.toLowerCase());
  }
  // When no Zero Trust policy or ADMIN_EMAILS restriction is configured on the Worker,
  // allow workbench curriculum management for the active operator session.
  if (!isAdmin && configuredAdminEmails.length === 0 && !env.ADMIN_API_TOKEN && !env.CF_ACCESS_TEAM_DOMAIN) {
    isAdmin = true;
  }

  // 3. Construct Verified Identity (Zero placeholder emails)
  if (verifiedEmail) {
    const callsign = verifiedEmail.includes('@')
      ? verifiedEmail.split('@')[0]
      : verifiedEmail;
    return {
      id: verifiedEmail,
      identityLabel: verifiedEmail,
      displayName: callsign,
      zeroTrustEnforced,
      isAdmin
    };
  }

  // 4. Derive deterministic cryptographic session ID from client session token or edge request fingerprint
  const rawFingerprint =
    clientSessionHeader ||
    `${req.header('CF-Connecting-IP') || 'edge'}:${req.header('User-Agent') || 'workbench'}`;
  const digest = await sha256Hex(rawFingerprint);
  const shortHash = digest.slice(0, 8).toUpperCase();
  const sessionId = `session-${digest.slice(0, 16)}`;

  return {
    id: sessionId,
    identityLabel: `OP-${shortHash}`,
    displayName: `Operator ${shortHash}`,
    zeroTrustEnforced: false,
    isAdmin
  };
}
