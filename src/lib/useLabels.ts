"use client";

import { useCallback, useEffect, useState } from "react";
import type { LabelColor } from "@/lib/db/queries";

export type Label = {
  id: string;
  ownerAddress: string;
  name: string;
  color: LabelColor;
  createdAt: string;
};

export const LABEL_STYLES: Record<LabelColor, { dot: string; chip: string }> = {
  green: { dot: "bg-green-500", chip: "bg-green-50 border-green-200 text-green-700" },
  blue: { dot: "bg-blue-500", chip: "bg-blue-50 border-blue-200 text-blue-700" },
  amber: { dot: "bg-amber-500", chip: "bg-amber-50 border-amber-200 text-amber-700" },
  red: { dot: "bg-red-500", chip: "bg-red-50 border-red-200 text-red-700" },
  violet: { dot: "bg-violet-500", chip: "bg-violet-50 border-violet-200 text-violet-700" },
  neutral: { dot: "bg-neutral-400", chip: "bg-neutral-100 border-neutral-200 text-neutral-600" },
};

/** The viewer's own labels + which messages carry them. Refresh with inbox. */
export function useLabels() {
  const [labels, setLabels] = useState<Label[] | null>(null);
  const [assigned, setAssigned] = useState<Record<string, string[]>>({});

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/labels");
      if (!res.ok) return;
      const data: {
        labels: Label[];
        assigned: { messageId: string; labelId: string }[];
      } = await res.json();
      setLabels(data.labels);
      const map: Record<string, string[]> = {};
      for (const a of data.assigned) {
        (map[a.messageId] ??= []).push(a.labelId);
      }
      setAssigned(map);
    } catch {
      // Labels are decoration — a failed fetch just means no chips this sync.
    }
  }, []);

  useEffect(() => {
    // Same fetch-on-mount pattern as the other hooks — setState only runs
    // after the awaited fetch resolves, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (name: string, color: LabelColor) => {
      const res = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't create label.");
      }
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await fetch(`/api/labels/${id}`, { method: "DELETE" }).catch(() => {});
      setLabels((prev) => prev?.filter((l) => l.id !== id) ?? prev);
      setAssigned((prev) => {
        const next: Record<string, string[]> = {};
        for (const [mid, ids] of Object.entries(prev)) {
          const rest = ids.filter((lid) => lid !== id);
          if (rest.length > 0) next[mid] = rest;
        }
        return next;
      });
    },
    []
  );

  const setForMessage = useCallback(async (messageId: string, labelIds: string[]) => {
    setAssigned((prev) => ({ ...prev, [messageId]: labelIds }));
    await fetch(`/api/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labelIds }),
    }).catch(() => {});
  }, []);

  return { labels, assigned, refresh, create, remove, setForMessage };
}
