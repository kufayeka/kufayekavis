"use client";

import { useState } from "react";
import type React from "react";
import { HexColorPicker } from "react-colorful";
import clsx from "clsx";

// Helper function to normalize URLs
export function normalizeUrl(url: string): string {
  if (!url || typeof url !== "string") return "https://example.com";

  const trimmed = url.trim();
  if (!trimmed) return "https://example.com";

  // If it already has a protocol, return as is
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // If it starts with www., add https://
  if (trimmed.startsWith("www.")) {
    return `https://${trimmed}`;
  }

  // For other cases, assume it's a domain and add https://
  return `https://${trimmed}`;
}

/* =========================
   Input helpers (a11y safe)
   ========================= */

export function numberInput(id: string, value: number, onChange: (v: number) => void) {
  return (
    <input
      id={id}
      className="px-2 py-1 rounded border border-black/15 w-full"
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function textInput(id: string, value: string, onChange: (v: string) => void) {
  return (
    <input
      id={id}
      className="px-2 py-1 rounded border border-black/15 w-full"
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function textAreaInput(id: string, value: string, onChange: (v: string) => void) {
  return (
    <textarea
      id={id}
      className="px-2 py-1 rounded border border-black/15 w-full min-h-[80px] resize-y"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
    />
  );
}

function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function normalizeHex(value: string): string {
  const v = value.trim();
  if (!isHexColor(v)) return "#000000";
  if (v.length === 4) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return v;
}

export function ColorInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const normalized = normalizeHex(value);
  const swatchColor = isHexColor(value) ? normalized : "transparent";

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {textInput(id, value, onChange)}
        <button
          type="button"
          className={clsx("h-8 w-8 rounded border border-black flex items-center justify-center cursor-pointer")}
          aria-label="Open color picker"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="4" y="4" width="16" height="16" rx="3" fill={swatchColor} stroke="currentColor" opacity="0.9" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute right-0 mt-2 rounded border border-black/15 bg-white">
          <div className="flex items-center justify-between mt-2">
            <button
              type="button"
              className="px-2 py-1 rounded border border-black/15 hover:bg-black/5 text-sm"
              onClick={() => onChange("transparent")}
            >
              Transparent
            </button>
            <button
              type="button"
              className="px-2 py-1 rounded border border-black/15 hover:bg-black/5 text-sm"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <HexColorPicker color={normalized} onChange={(c) => onChange(c)} />
        </div>
      )}
    </div>
  );
}

/* =========================
   Row (label + control)
   ========================= */

export function Row({
  id,
  label,
  control,
}: {
  id: string;
  label: string;
  control: React.ReactNode;
}) {
  return (
    <>
      <label htmlFor={id} className="text-sm text-black/70">
        {label}
      </label>
      {control}
    </>
  );
}
