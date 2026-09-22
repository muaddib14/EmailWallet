"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Plus, Tag, Trash2 } from "lucide-react";
import type { LabelColor } from "@/lib/db/queries";
import { LABEL_STYLES, type Label } from "@/lib/useLabels";

const PALETTE: LabelColor[] = ["green", "blue", "amber", "red", "violet", "neutral"];
const DROPDOWN_WIDTH = 240; // matches w-60

/** Per-message label picker: checkbox list + inline create + delete. */
export function LabelPicker({
  assigned,
  labels,
  onChange,
  onCreate,
  onDelete,
}: {
  assigned: string[];
  labels: Label[] | null;
  onChange: (labelIds: string[]) => void;
  onCreate: (name: string, color: LabelColor) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [color, setColor] = useState<LabelColor>("green");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; caretLeft: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Portalled to document.body (see below) so an ancestor's overflow-hidden
    // (message cards clip to rounded corners) can't clip this dropdown —
    // position it against the trigger button's own viewport rect instead of
    // relying on CSS absolute positioning within the clipped parent.
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.min(rect.right - DROPDOWN_WIDTH, window.innerWidth - DROPDOWN_WIDTH - 8);
      setPos({
        top: rect.bottom + 8,
        left,
        caretLeft: rect.left + rect.width / 2 - left,
      });
    }

    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        boxRef.current &&
        !boxRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // Reposition tracks the trigger if the panel scrolls; closing on resize
    // avoids a stale-position dropdown rather than chasing every edge case.
    const onScroll = () => {
      const r = buttonRef.current?.getBoundingClientRect();
      if (r) {
        const left = Math.min(r.right - DROPDOWN_WIDTH, window.innerWidth - DROPDOWN_WIDTH - 8);
        setPos({
          top: r.bottom + 8,
          left,
          caretLeft: r.left + r.width / 2 - left,
        });
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  function toggle(id: string) {
    onChange(assigned.includes(id) ? assigned.filter((l) => l !== id) : [...assigned, id]);
  }

  async function handleCreate() {
    if (!draft.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate(draft.trim(), color);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create label.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={boxRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        title="Labels"
        className={`p-1.5 rounded-lg transition-colors ${
          assigned.length > 0
            ? "text-neutral-700 bg-neutral-100"
            : "text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
        }`}
      >
        <Tag className="w-4 h-4" />
      </button>

      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: DROPDOWN_WIDTH }}
          className="z-[70] rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25)] p-2 [animation:modal-dialog-in_0.15s_cubic-bezier(0.16,1,0.3,1)]">
          {/* Caret pointing back at the trigger button — without it the
              portalled dropdown reads as an unrelated floating box. */}
          <span
            aria-hidden="true"
            style={{ left: pos.caretLeft - 6 }}
            className="absolute -top-1.5 h-3 w-3 rotate-45 border-l border-t border-neutral-200 bg-white"
          />
          {(labels ?? []).length === 0 && (
            <p className="px-2 py-2 text-xs text-neutral-400 font-geist">
              No labels yet — create one below.
            </p>
          )}
          <ul className="max-h-48 overflow-y-auto">
            {(labels ?? []).map((label) => {
              const checked = assigned.includes(label.id);
              const style = LABEL_STYLES[label.color];
              return (
                <li
                  key={label.id}
                  className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-50"
                >
                  <button
                    onClick={() => toggle(label.id)}
                    className="flex-1 min-w-0 flex items-center gap-2 text-left"
                  >
                    <span
                      className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        checked ? "bg-neutral-900 border-neutral-900 text-white" : "border-neutral-300 text-transparent"
                      }`}
                    >
                      <Check className="w-3 h-3" />
                    </span>
                    <span className={`h-2 w-2 rounded-full shrink-0 ${style.dot}`} />
                    <span className="flex-1 min-w-0 truncate text-[13px] font-geist text-neutral-800">
                      {label.name}
                    </span>
                  </button>
                  <button
                    onClick={() => onDelete(label.id)}
                    title={`Delete ${label.name}`}
                    className="p-1 rounded text-neutral-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-1 pt-2 border-t border-neutral-100">
            <div className="flex items-center gap-1.5 px-1">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  title={c}
                  className={`h-5 w-5 rounded-full ${LABEL_STYLES[c].dot} transition-all ${
                    color === c ? "ring-2 ring-offset-2 ring-neutral-900" : "opacity-60 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 24))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreate();
                }}
                placeholder="New label…"
                maxLength={24}
                className="flex-1 min-w-0 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[13px] font-geist text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900"
              />
              <button
                onClick={() => void handleCreate()}
                disabled={busy || !draft.trim()}
                title="Create label"
                className="p-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 transition-colors disabled:opacity-40 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {error && <p className="mt-1.5 px-1 text-[11px] text-red-600 font-geist">{error}</p>}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/** Colored chips row (list rows, max 3 + overflow). */
export function LabelChips({ labelIds, labels }: { labelIds: string[]; labels: Label[] | null }) {
  if (labelIds.length === 0 || !labels) return null;
  const defs = labelIds
    .map((id) => labels.find((l) => l.id === id))
    .filter((l): l is Label => !!l)
    .slice(0, 3);
  if (defs.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      {defs.map((l) => (
        <span
          key={l.id}
          title={l.name}
          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-geist font-medium ${LABEL_STYLES[l.color].chip}`}
        >
          <span className={`h-1 w-1 rounded-full ${LABEL_STYLES[l.color].dot}`} />
          {l.name}
        </span>
      ))}
      {labelIds.length > defs.length && (
        <span className="text-[10px] font-geist text-neutral-400">+{labelIds.length - defs.length}</span>
      )}
    </span>
  );
}
