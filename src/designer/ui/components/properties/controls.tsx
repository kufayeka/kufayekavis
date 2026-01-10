"use client";

import { useState } from "react";
import type React from "react";
import { HexColorPicker } from "react-colorful";
import clsx from "clsx";
import { Button, IconButton, Popover, TextField, Typography } from "@mui/material";

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
    <TextField
      id={id}
      fullWidth
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function textInput(id: string, value: string, onChange: (v: string) => void) {
  return (
    <TextField id={id} fullWidth value={value} onChange={(e) => onChange(e.target.value)} />
  );
}

export function textAreaInput(id: string, value: string, onChange: (v: string) => void) {
  return (
    <TextField
      id={id}
      fullWidth
      multiline
      minRows={3}
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const normalized = normalizeHex(value);
  const swatchColor = isHexColor(value) ? normalized : "transparent";

  const open = Boolean(anchorEl);
  const onClose = () => setAnchorEl(null);

  return (
    <div className="flex items-center gap-2">
      {textInput(id, value, onChange)}
      <IconButton
        aria-label="Open color picker"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        size="small"
        className={clsx("border border-black/15")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="3" fill={swatchColor} stroke="currentColor" opacity="0.9" />
        </svg>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <div className="p-2">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Button variant="outlined" onClick={() => onChange("transparent")}>Transparent</Button>
            <Button variant="outlined" onClick={onClose}>Close</Button>
          </div>
          <HexColorPicker color={normalized} onChange={(c) => onChange(c)} />
        </div>
      </Popover>
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
      <Typography component="label" htmlFor={id} variant="caption" className="text-black/70">
        {label}
      </Typography>
      {control}
    </>
  );
}
