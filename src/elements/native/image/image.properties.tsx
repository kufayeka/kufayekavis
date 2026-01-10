"use client";

import type React from "react";
import type { DesignerAPI } from "../../../designer/core/api";
import type { DesignerEngine, DesignerState } from "../../../designer/core/engine";
import type { DesignerHost } from "../../../designer/core/host";
import type { ImageElement } from "../../../designer/core/types";
import { Row, numberInput, textInput } from "../../../designer/ui/components/properties/controls";
import { Button, ButtonGroup, Checkbox, FormControlLabel, MenuItem, TextField } from "@mui/material";
import { ColorInput } from "../../../designer/ui/components/properties/controls";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ColorizeIcon from "@mui/icons-material/Colorize";

type PropertiesCtx = {
  engine: DesignerEngine;
  state: DesignerState;
  api: DesignerAPI;
  host: DesignerHost;
};

export function renderImageProperties(ctxUnknown: unknown): React.ReactNode {
  const { engine, state } = ctxUnknown as PropertiesCtx;
  const selectedId = state.selection.ids.length === 1 ? state.selection.ids[0] : null;
  const el = selectedId ? state.doc.elements[selectedId] : null;
  if (!el || el.type !== "image") return null;

  const img = el as ImageElement;
  const baseId = `el-${img.id}`;

  const filters = img.imageFilters ?? {};
  const getNum = (v: unknown, fallback: number) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const parseHex = (hex: string): { r: number; g: number; b: number } | null => {
    const s = String(hex || "").trim();
    if (!s.startsWith("#")) return null;
    const raw = s.slice(1);
    if (raw.length === 3) {
      const r = parseInt(raw[0] + raw[0], 16);
      const g = parseInt(raw[1] + raw[1], 16);
      const b = parseInt(raw[2] + raw[2], 16);
      if ([r, g, b].some((x) => Number.isNaN(x))) return null;
      return { r, g, b };
    }
    if (raw.length === 6) {
      const r = parseInt(raw.slice(0, 2), 16);
      const g = parseInt(raw.slice(2, 4), 16);
      const b = parseInt(raw.slice(4, 6), 16);
      if ([r, g, b].some((x) => Number.isNaN(x))) return null;
      return { r, g, b };
    }
    return null;
  };

  const applyChromaKey = async () => {
    const src = (img.originalHref && img.originalHref.trim()) ? img.originalHref : img.href;
    if (!src || !src.trim()) {
      window.alert("Image href is empty");
      return;
    }

    const colorHex = img.bgRemoveColor || "#ffffff";
    const key = parseHex(colorHex);
    if (!key) {
      window.alert("Invalid chroma-key color. Use hex like #ffffff");
      return;
    }

    const tolerance = Math.max(0, Math.min(255, getNum(img.bgRemoveTolerance, 40)));

    try {
      const image = new Image();
      // Best-effort for CORS; if the server doesn't allow it, canvas ops will fail.
      image.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Failed to load image"));
        image.src = src;
      });

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, image.naturalWidth || image.width || 1);
      canvas.height = Math.max(1, image.naturalHeight || image.height || 1);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D not available");

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const px = data.data;
      const tol2 = tolerance * tolerance;

      for (let i = 0; i < px.length; i += 4) {
        const r = px[i];
        const g = px[i + 1];
        const b = px[i + 2];
        const dr = r - key.r;
        const dg = g - key.g;
        const db = b - key.b;
        const dist2 = dr * dr + dg * dg + db * db;
        if (dist2 <= tol2) {
          px[i + 3] = 0;
        }
      }

      ctx.putImageData(data, 0, 0);
      const out = canvas.toDataURL("image/png");

      engine.updateElement(img.id, {
        originalHref: img.originalHref && img.originalHref.trim() ? img.originalHref : img.href,
        href: out,
        bgRemoveColor: colorHex,
        bgRemoveTolerance: tolerance,
      });
    } catch (e) {
      window.alert(
        e instanceof Error
          ? `${e.message}. If this is a remote URL, it may be blocked by CORS — try using a data URL or same-origin image.`
          : "Failed to process image",
      );
    }
  };

  const pickKeyColor = async () => {
    const w = window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } };
    if (!w.EyeDropper) {
      window.alert("Eyedropper is not supported in this browser. Try a Chromium-based browser.");
      return;
    }

    try {
      const eye = new w.EyeDropper();
      const res = await eye.open();
      const hex = String(res?.sRGBHex || "").trim();
      if (!hex) return;
      engine.updateElement(img.id, { bgRemoveColor: hex });
    } catch {
      // user cancelled
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 items-center">
      <Row id={`${baseId}-x`} label="X" control={numberInput(`${baseId}-x`, img.x, (v) => engine.updateElement(img.id, { x: v }))} />
      <Row id={`${baseId}-y`} label="Y" control={numberInput(`${baseId}-y`, img.y, (v) => engine.updateElement(img.id, { y: v }))} />
      <Row id={`${baseId}-w`} label="W" control={numberInput(`${baseId}-w`, img.width, (v) => engine.updateElement(img.id, { width: Math.max(1, v) }))} />
      <Row id={`${baseId}-h`} label="H" control={numberInput(`${baseId}-h`, img.height, (v) => engine.updateElement(img.id, { height: Math.max(1, v) }))} />
      <Row id={`${baseId}-href`} label="Href" control={textInput(`${baseId}-href`, img.href, (v) => engine.updateElement(img.id, { href: v }))} />
      <Row id={`${baseId}-aspect`} label="Aspect" control={textInput(`${baseId}-aspect`, img.preserveAspectRatio, (v) => engine.updateElement(img.id, { preserveAspectRatio: v }))} />
      <Row
        id={`${baseId}-fit`}
        label="Fit"
        control={
          <TextField
            id={`${baseId}-fit`}
            select
            fullWidth
            value={img.fit ?? "none"}
            onChange={(e) => {
              const v = String(e.target.value) as "none" | "contain" | "cover" | "stretch";
              let pra = "xMidYMid meet";
              if (v === "cover") pra = "xMidYMid slice";
              if (v === "stretch") pra = "none";
              engine.updateElement(img.id, { fit: v, preserveAspectRatio: pra });
            }}
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="contain">Contain</MenuItem>
            <MenuItem value="stretch">Stretch</MenuItem>
            <MenuItem value="cover">Cover</MenuItem>
          </TextField>
        }
      />

      <div className="col-span-2 flex items-center gap-2">
        <ButtonGroup>
          <Button
            onClick={() => {
              const nw = img.naturalWidth;
              const nh = img.naturalHeight;
              if (nw && nh) engine.updateElement(img.id, { width: nw, height: nh });
            }}
          >
            Scale to natural
          </Button>
          <Button
            onClick={() => {
              engine.updateElement(img.id, { fit: "contain", preserveAspectRatio: "xMidYMid meet" });
            }}
          >
            Fit to box
          </Button>
        </ButtonGroup>
      </div>

      <div className="col-span-2">
        <div className="font-medium mt-2">Image Filters</div>
      </div>

      <Row
        id={`${baseId}-f-brightness`}
        label="Brightness"
        control={
          <TextField
            id={`${baseId}-f-brightness`}
            type="number"
            inputProps={{ min: 0, max: 3, step: 0.05 }}
            fullWidth
            value={getNum(filters.brightness, 1)}
            onChange={(e) => {
              const v = Math.max(0, Math.min(3, Number(e.target.value)));
              engine.updateElement(img.id, { imageFilters: { ...filters, brightness: v } });
            }}
          />
        }
      />

      <Row
        id={`${baseId}-f-contrast`}
        label="Contrast"
        control={
          <TextField
            id={`${baseId}-f-contrast`}
            type="number"
            inputProps={{ min: 0, max: 3, step: 0.05 }}
            fullWidth
            value={getNum(filters.contrast, 1)}
            onChange={(e) => {
              const v = Math.max(0, Math.min(3, Number(e.target.value)));
              engine.updateElement(img.id, { imageFilters: { ...filters, contrast: v } });
            }}
          />
        }
      />

      <Row
        id={`${baseId}-f-saturate`}
        label="Saturate"
        control={
          <TextField
            id={`${baseId}-f-saturate`}
            type="number"
            inputProps={{ min: 0, max: 3, step: 0.05 }}
            fullWidth
            value={getNum(filters.saturate, 1)}
            onChange={(e) => {
              const v = Math.max(0, Math.min(3, Number(e.target.value)));
              engine.updateElement(img.id, { imageFilters: { ...filters, saturate: v } });
            }}
          />
        }
      />

      <Row
        id={`${baseId}-f-grayscale`}
        label="Grayscale"
        control={
          <TextField
            id={`${baseId}-f-grayscale`}
            type="number"
            inputProps={{ min: 0, max: 1, step: 0.05 }}
            fullWidth
            value={getNum(filters.grayscale, 0)}
            onChange={(e) => {
              const v = Math.max(0, Math.min(1, Number(e.target.value)));
              engine.updateElement(img.id, { imageFilters: { ...filters, grayscale: v } });
            }}
          />
        }
      />

      <Row
        id={`${baseId}-f-blur`}
        label="Blur"
        control={
          <TextField
            id={`${baseId}-f-blur`}
            type="number"
            inputProps={{ min: 0, max: 50, step: 0.5 }}
            fullWidth
            value={getNum(filters.blur, 0)}
            onChange={(e) => {
              const v = Math.max(0, Math.min(50, Number(e.target.value)));
              engine.updateElement(img.id, { imageFilters: { ...filters, blur: v } });
            }}
          />
        }
      />

      <div className="col-span-2 flex items-center gap-2">
        <Button
          onClick={() => {
            engine.updateElement(img.id, { imageFilters: { brightness: 1, contrast: 1, saturate: 1, grayscale: 0, blur: 0 } });
          }}
        >
          Reset filters
        </Button>
      </div>

      <div className="col-span-2">
        <div className="font-medium mt-2">Background Removal (Simple)</div>
        <div className="text-xs text-black/60 mt-1">Chroma-key: picks a color and makes it transparent.</div>
      </div>

      <Row
        id={`${baseId}-bg-color`}
        label="Key Color"
        control={
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <ColorInput
                id={`${baseId}-bg-color`}
                value={img.bgRemoveColor ?? "#ffffff"}
                onChange={(v) => engine.updateElement(img.id, { bgRemoveColor: v })}
              />
            </div>
            <Tooltip title="Pick color from screen">
              <IconButton aria-label="Pick key color" onClick={() => void pickKeyColor()}>
                <ColorizeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        }
      />

      <Row
        id={`${baseId}-bg-tol`}
        label="Tolerance"
        control={
          <TextField
            id={`${baseId}-bg-tol`}
            type="number"
            inputProps={{ min: 0, max: 255, step: 1 }}
            fullWidth
            value={getNum(img.bgRemoveTolerance, 40)}
            onChange={(e) => engine.updateElement(img.id, { bgRemoveTolerance: Math.max(0, Math.min(255, Number(e.target.value))) })}
          />
        }
      />

      <div className="col-span-2 flex items-center gap-2">
        <Button onClick={() => void applyChromaKey()}>Make transparent</Button>
        <Button
          disabled={!img.originalHref}
          onClick={() => {
            if (!img.originalHref) return;
            engine.updateElement(img.id, { href: img.originalHref, originalHref: undefined });
          }}
        >
          Reset image
        </Button>
      </div>
    </div>
  );
}
