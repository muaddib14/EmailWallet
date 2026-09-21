# Wallet Mail — MVP Status

Repo: `github.com/muaddib14/EmailWallet`
Stack: Next.js 16 (App Router) · Tailwind v4 · wagmi/viem · Neon Postgres (Drizzle ORM) · tweetnacl
Last updated: 2026-09-21

## Ringkasan

Wallet Mail adalah email untuk wallet — sign in pakai wallet EVM (bukan password), setiap pesan ditandatangani wallet pengirim dan dienkripsi end-to-end di browser sebelum masuk server. Terinspirasi dari RobinMail, dibangun ulang dari nol.

Ini bukan prototype UI doang — auth, enkripsi, database, dan semua fitur di bawah sudah **beneran jalan dan sudah ditest end-to-end** (script otomatis, bukan cuma "kelihatannya jalan"), kecuali yang eksplisit ditandai belum.

---

## ✅ Sudah selesai & jalan

### 1. Landing Page (`/`)
- Light mode, terinspirasi pattern proton.me (nav pill, hero, trust strip, card putih+shadow, closing CTA) — bukan copy 14-section-nya, cuma pattern-nya, section disesuaikan produk kita
- Background hero: `SoftGlow` — radial gradient CSS statis, bukan WebGL (ringan, gak ada lag)
- Section: Hero, Trusted-by (marquee logo wallet), Manifesto, Us-vs-Them, Core Features, Protocol (3 langkah), Stats/traction, Closing CTA, Footer

### 2. Autentikasi Wallet (2-signature, sesuai spec awal)
- Connect wallet apapun (MetaMask, Rabby, dll) via `wagmi` injected connector
- **Signature #1 (session)**: pakai nonce sekali-pakai (SIWE-style) — `GET /api/session/nonce` → sign → `POST /api/session` verify + consume nonce atomic → httpOnly cookie 24 jam
- **Signature #2 (encryption)**: derive NaCl box keypair (curve25519-xsalsa20-poly1305, algoritma sama kayak `eth_getEncryptionPublicKey` MetaMask lama). Secret key **gak pernah** ke server, cuma public key yang di-publish
- Session + encryption signature di-cache di `sessionStorage` (bukan localStorage) biar refresh gak minta tanda tangan ulang — trade-off keamanan yang udah didiskusikan & disetujui
- State auth **shared via Context** (`WalletAuthProvider`) — semua tombol (nav, hero, inbox) baca status yang sama, gak ada lagi "satu tombol update, yang lain enggak"

### 3. Enkripsi End-to-End
- Subjek & body dienkripsi di browser pakai `tweetnacl` box encryption, server cuma nyimpen ciphertext
- Sender & recipient sama-sama bisa decrypt (Diffie-Hellman shared secret simetris)
- `messageHash` (keccak256 dari plaintext) ditandatangani pengirim → bukti otentisitas tanpa buka isi pesan
- Drafts dienkripsi ke **public key sendiri** (self-box), karena recipient mungkin belum valid pas masih ngetik

### 4. Inbox App (`/inbox`)
- Layout list→detail (kayak Proton/Gmail) — list full-width, klik pesan baru detail full-width + tombol Back, bukan 3-kolom sempit
- Sidebar collapsible (localStorage), compose sebagai floating panel ala Gmail (docked kanan-bawah, minimize/expand beneran fungsional)
- Folder: **Inbox, Starred, Sent, Drafts, Archive, Trash** — semua fungsional beneran (bukan UI kosong)
- Search live (filter dari subjek/isi/lawan bicara yang udah didecrypt)
- Flag (read/starred/archived/deleted) **per-viewer**, bukan shared row — recipient archive gak ikut archive di sisi pengirim (ini bug asli yang sempet ada & udah difix)
- Trash: soft-delete + Restore + Delete Forever (purge cuma di sisi user yang mem-purge, gak nyentuh salinan pihak lain)

### 5. Database (Neon Postgres via Drizzle)
Tabel: `wallets`, `messages`, `message_flags` (per-user, lihat poin di atas), `drafts`, `sessions`, `login_nonces`, `names` (siap tapi belum ada yang isi — lihat bagian "Belum")

### 6. Keamanan (hasil audit + fix)
- ✅ Session replay attack — closed (nonce sekali pakai + atomic consume)
- ✅ Limit ukuran payload (`20KB`/field) di messages & drafts — cegah storage abuse
- ✅ Rate limiting di `/api/session`, `/api/session/nonce`, `/api/messages`, `/api/wallets/publish-key` — in-memory, per-instance (jujur: bukan distributed, tapi nutup kasus umum)
- ✅ Validasi panjang/format `encryptionPublicKey`

### 7. Welcome Message (fitur baru, terinspirasi Proton)
- Wallet baru yang pertama kali publish encryption key otomatis dapat **3 pesan resmi** dari wallet sistem ("Wallet Mail Team") — pesan asli, ditandatangani & dienkripsi lewat jalur yang sama kayak pesan biasa (bukan data dummy)
- Butuh `SYSTEM_WALLET_PRIVATE_KEY` di env (sudah di-generate, ada di `.env` lokal, **belum** di-set di Vercel)

### 8. Logo Wallet Resmi
- MetaMask & Rabby: SVG resmi dari sumber asli mereka (metamask.io/assets, RabbyHub/logo GitHub) — bukan tebakan/scrape pihak ketiga
- Robinhood Wallet, WalletConnect, Coinbase Wallet: dari simple-icons (registry brand SVG terverifikasi)

---

## ❌ Belum dikerjakan / masih placeholder

| Item | Status |
|---|---|
| **Naming system** (mint nama `.mail` jadi NFT) | Tabel `names` sudah ada, tapi **belum ada smart contract, belum ada UI mint**. Compose ke nama (`maya.mail`) akan selalu gagal resolve karena gak ada data |
| **Robinhood Chain RPC asli** | wagmi masih pakai `mainnet` sebagai placeholder — chain ID/RPC resmi Robinhood Chain belum ketemu sumber terverifikasi |
| **Deploy Vercel** | Kode sudah siap deploy, tapi `vercel login` butuh browser auth manual dari kamu. `DATABASE_URL` & `SYSTEM_WALLET_PRIVATE_KEY` juga belum di-set di Vercel env vars |
| **Settings** | Tombol ada di sidebar, **belum ada fungsi/halaman sama sekali** |
| **Contacts & Notifications** | Sengaja **dihapus** dari sidebar (bukan dibangun) — gak ada rencana konkret buat fitur ini |
| Rate limiting terdistribusi | Sekarang in-memory per-instance, gak nahan serangan dari banyak instance Vercel sekaligus. Upgrade ke Upstash Redis kalau perlu |
| Read receipt | Disebut di brief awal, belum diimplementasi |

---

## Cara jalanin lokal

```bash
cd walletmail
npm install
cp .env.example .env.local   # isi DATABASE_URL + SYSTEM_WALLET_PRIVATE_KEY
npm run db:migrate            # kalau migration belum jalan
npm run dev
```

## Env vars yang wajib ada
```
DATABASE_URL=<neon connection string>
SYSTEM_WALLET_PRIVATE_KEY=<private key wallet sistem>
```
