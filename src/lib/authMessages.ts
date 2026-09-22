// Shared with both the client (useWalletAuth, which requests these signatures)
// and the server (the session API route, which re-derives the exact same
// string to verify the signature against). Keep this the single source of
// truth — if the wording drifts between client and server, verification
// breaks silently.

// Takes a server-issued one-time nonce (see GET /api/session/nonce) so a
// signature is only ever valid for a single login attempt within a short
// window, instead of being a fixed string per address that could be
// replayed forever if it ever leaked.
export const SESSION_MESSAGE = (address: string, nonce: string) =>
  `Sign in to Quill\n\nNonce: ${nonce}\n\nThis signature opens a 24-hour session for ${address}. It does not cost gas and will not trigger a blockchain transaction.`;

// Deliberately has NO nonce: the derived key must stay stable across logins,
// or every past message would become permanently undecryptable the next time
// you sign in. This signature never leaves the browser as a network request —
// the only place it's persisted is the sessionStorage cache, a tradeoff
// already made explicit to the user.
export const ENCRYPTION_MESSAGE = (address: string) =>
  `Unlock Quill encryption\n\nThis signature derives the private key that decrypts mail for ${address}. Only sign this on wallet-mail.app.`;
