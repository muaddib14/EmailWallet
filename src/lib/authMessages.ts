// Shared with both the client (useWalletAuth, which requests these signatures)
// and the server (the session API route, which re-derives the exact same
// string to verify the signature against). Keep this the single source of
// truth — if the wording drifts between client and server, verification
// breaks silently.

export const SESSION_MESSAGE = (address: string) =>
  `Sign in to Wallet Mail\n\nThis signature opens a 24-hour session for ${address}. It does not cost gas and will not trigger a blockchain transaction.`;

export const ENCRYPTION_MESSAGE = (address: string) =>
  `Unlock Wallet Mail encryption\n\nThis signature derives the private key that decrypts mail for ${address}. Only sign this on wallet-mail.app.`;
