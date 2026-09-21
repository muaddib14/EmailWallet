const CACHE_KEY = "walletmail:auth:v1";

export type CachedAuth = {
  address: string;
  sessionSignature: string;
  encryptionSignature: string;
};

/**
 * Per-tab cache for the two signatures obtained during sign-in, so a page
 * refresh doesn't force both wallet popups again. Uses sessionStorage (not
 * localStorage) deliberately: it's cleared the moment the tab closes, and
 * never shared across tabs — the closest thing to "still in memory" that
 * survives a reload. This is a security/UX tradeoff (an XSS on this page
 * could read it) accepted explicitly rather than left as an oversight.
 */
export function saveAuthCache(data: CachedAuth) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (private browsing, quota, etc). Sign-in still
    // works; the user just re-signs on the next reload.
  }
}

export function loadAuthCache(): CachedAuth | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.address === "string" &&
      typeof parsed?.sessionSignature === "string" &&
      typeof parsed?.encryptionSignature === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearAuthCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // Nothing to do if storage isn't available.
  }
}
