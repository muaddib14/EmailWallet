"use client";

import { useEffect, useState } from "react";
import { Download, FileIcon, LoaderCircle } from "lucide-react";
import { useWalletAuth } from "@/lib/useWalletAuth";
import {
  decryptAttachmentBytes,
  decryptAttachmentName,
  u8ToArrayBuffer,
  unwrapFileKey,
  type AttachmentMeta,
} from "@/lib/attachments";

const pubkeyCache = new Map<string, string | null>();

async function counterpartyKey(address: string): Promise<string | null> {
  if (pubkeyCache.has(address)) return pubkeyCache.get(address) ?? null;
  try {
    const res = await fetch(`/api/wallets/${address}`);
    if (!res.ok) return null;
    const data = await res.json();
    const key = data.encryptionPublicKey ?? null;
    if (key) pubkeyCache.set(address, key);
    return key;
  } catch {
    return null;
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ReadyItem = { meta: AttachmentMeta; filename: string; fileKey: Uint8Array };

/** Decrypted attachment chips for one message: names resolve, click downloads. */
export function AttachmentChips({
  items,
  counterparty,
}: {
  items: AttachmentMeta[];
  counterparty: string;
}) {
  const { keyPair } = useWalletAuth();
  const [ready, setReady] = useState<ReadyItem[] | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (!keyPair || items.length === 0) {
        if (!cancelled) setReady(items.length === 0 ? [] : null);
        return;
      }
      const theirKey = await counterpartyKey(counterparty);
      if (cancelled) return;
      if (!theirKey) {
        setReady([]);
        return;
      }
      const out: ReadyItem[] = [];
      for (const meta of items) {
        const fileKey = unwrapFileKey(meta, theirKey, keyPair.secretKey);
        if (!fileKey) continue;
        out.push({ meta, filename: decryptAttachmentName(meta, fileKey), fileKey });
      }
      if (!cancelled) setReady(out);
    }
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [items, counterparty, keyPair]);

  async function download(item: ReadyItem) {
    setDownloading(item.meta.id);
    try {
      const res = await fetch(item.meta.blobUrl);
      if (!res.ok) throw new Error("Download failed.");
      const combined = new Uint8Array(await res.arrayBuffer());
      const bytes = decryptAttachmentBytes(combined, item.fileKey);
      if (!bytes) throw new Error("Couldn't decrypt this file.");
      const url = URL.createObjectURL(new Blob([u8ToArrayBuffer(bytes)], { type: item.meta.mime }));
      const a = document.createElement("a");
      a.href = url;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error("[attachments] download failed:", err);
    } finally {
      setDownloading(null);
    }
  }

  if (!ready || ready.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {ready.map((item) => {
        const busy = downloading === item.meta.id;
        return (
          <button
            key={item.meta.id}
            onClick={() => void download(item)}
            disabled={busy}
            title={`Download ${item.filename}`}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left hover:border-neutral-400 hover:shadow-sm transition-all disabled:opacity-60 max-w-full"
          >
            {busy ? (
              <LoaderCircle className="w-4 h-4 animate-spin text-neutral-400 shrink-0" />
            ) : (
              <FileIcon className="w-4 h-4 text-neutral-400 shrink-0" />
            )}
            <span className="min-w-0">
              <span className="block text-xs font-geist font-medium text-neutral-800 truncate max-w-44">
                {item.filename}
              </span>
              <span className="block text-[10px] font-geist text-neutral-400">
                {formatSize(Number(item.meta.sizeBytes) || 0)} · encrypted
              </span>
            </span>
            {!busy && <Download className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
