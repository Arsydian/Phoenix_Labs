/**
 * Phoenix Labs Academy — Client API & Session Token Helper
 *
 * Generates and persists a cryptographic operator session UUID in browser storage
 * and attaches `X-Operator-Session` headers to all edge API calls.
 */

const SESSION_STORAGE_KEY = 'phoenix_operator_session_id';

export function getOperatorSessionId(): string {
  if (typeof window === 'undefined') return 'edge-ssr-session';
  try {
    let existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!existing) {
      existing =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
      window.localStorage.setItem(SESSION_STORAGE_KEY, existing);
    }
    return existing;
  } catch {
    return 'ephemeral-operator-session';
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  headers.set('X-Operator-Session', getOperatorSessionId());
  return fetch(path, {
    ...init,
    headers
  });
}
