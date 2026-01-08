"use client";

import { useState, useSyncExternalStore } from "react";
import type React from "react";
import { HexColorPicker } from "react-colorful";
import type { DesignerEngine, DesignerState } from "../../core/engine";
import type { DesignerElement, ImageElement, TextElement, CustomElement } from "../../core/types";
import { useDesignerHost } from "../hooks/useDesignerHost";

// Helper function to normalize URLs
function normalizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return "https://example.com";
  
  const trimmed = url.trim();
  if (!trimmed) return "https://example.com";
  
  // If it already has a protocol, return as is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  
  // If it starts with www., add https://
  if (trimmed.startsWith('www.')) {
    return `https://${trimmed}`;
  }
  
  // For other cases, assume it's a domain and add https://
  return `https://${trimmed}`;
}

/* =========================
   Input helpers (a11y safe)
   ========================= */

function numberInput(
  id: string,
  value: number,
  onChange: (v: number) => void
) {
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

function textInput(
  id: string,
  value: string,
  onChange: (v: string) => void
) {
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

function textAreaInput(
  id: string,
  value: string,
  onChange: (v: string) => void
) {
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

function ColorInput({
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
          className={`h-8 w-8 rounded border border-black flex items-center justify-center cursor-pointer`}
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


          <HexColorPicker
            color={normalized}
            onChange={(c) => onChange(c)}
          />

        </div>
      )}
    </div>
  );
}

/* =========================
   Main Panel
   ========================= */

export function PropertiesPanel({
  engine,
  state,
}: {
  engine: DesignerEngine;
  state: DesignerState;
}) {
  const host = useDesignerHost();
  const pluginSections = useSyncExternalStore(
    (listener) => host.registry.subscribe(listener),
    () => host.registry.getPropertiesSections(),
    () => host.registry.getPropertiesSections(),
  );

  const selectedId =
    state.selection.ids.length === 1 ? state.selection.ids[0] : null;
  const selected = selectedId
    ? state.doc.elements[selectedId]
    : null;

  return (
    <div>
      <div className="font-semibold mb-2">Properties</div>

      {/* Canvas */}
      <div className="rounded border border-black/15 p-3 space-y-3">
        <div className="font-medium">Canvas</div>

        <div className="grid grid-cols-2 gap-2 items-center">
          <Row
            id="canvas-width"
            label="Width"
            control={numberInput("canvas-width", state.doc.canvas.width, (v) =>
              engine.setCanvas({ width: Math.max(1, v) })
            )}
          />

          <Row
            id="canvas-height"
            label="Height"
            control={numberInput("canvas-height", state.doc.canvas.height, (v) =>
              engine.setCanvas({ height: Math.max(1, v) })
            )}
          />

          <Row
            id="canvas-bg"
            label="Background"
            control={
              <ColorInput
                id="canvas-bg"
                value={state.doc.canvas.background}
                onChange={(v) => engine.setCanvas({ background: v })}
              />
            }
          />

          <Row
            id="canvas-grid"
            label="Grid"
            control={
              <input
                title="titleCanvas"
                id="canvas-grid"
                type="checkbox"
                checked={state.doc.canvas.gridEnabled}
                onChange={(e) =>
                  engine.setCanvas({ gridEnabled: e.target.checked })
                }
              />
            }
          />

          <Row
            id="canvas-snap"
            label="Snap to Grid"
            control={
              <input
                title="titleSnap"
                id="canvas-snap"
                type="checkbox"
                checked={state.doc.canvas.snapToGrid}
                onChange={(e) =>
                  engine.setCanvas({ snapToGrid: e.target.checked })
                }
              />
            }
          />

          <Row
            id="canvas-grid-size"
            label="Grid Size"
            control={numberInput(
              "canvas-grid-size",
              state.doc.canvas.gridSize,
              (v) =>
                engine.setCanvas({ gridSize: Math.max(1, v) })
            )}
          />
        </div>
      </div>

      {/* Selection */}
      <div className="rounded border border-black/15 p-3 space-y-3 mt-4">
        <div className="font-medium">Selection</div>

        {state.selection.ids.length === 0 && (
          <div className="text-sm text-black/60">No selection</div>
        )}

        {state.selection.ids.length > 1 && (
          <div className="text-sm text-black/60">
            Multiple selected: {state.selection.ids.length}
          </div>
        )}

        {selected && (
          <ElementProperties engine={engine} el={selected} />
        )}
      </div>

      {pluginSections.length > 0 && (
        <div className="rounded border border-black/15 p-3 space-y-3 mt-4">
          <div className="font-medium">Plugins</div>
          {pluginSections.map((s) => (
            <div key={s.id}>{s.render({ engine, state, api: host.api, host }) as React.ReactNode}</div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================
   Element Properties
   ========================= */

function ElementProperties({
  engine,
  el,
}: {
  engine: DesignerEngine;
  el: DesignerElement;
}) {
  const baseId = `el-${el.id}`;

  const common = (
    <>
   
      
      <div className="col-span-2">
         <Row
        id={`${baseId}-id`}
        label="ID"
        control={
          <div className="flex items-center gap-2">
            <input
              id={`${baseId}-id`}
              className="px-2 py-1 rounded border border-black/15 w-full"
              type="text"
              readOnly
              value={el.id}
            />
            <button
              className="px-2 py-1 rounded border border-black/15"
              onClick={() => navigator.clipboard?.writeText(el.id)}
              aria-label="Copy element id"
            >
              Copy
            </button>
          </div>
        }
      />
      
        <div className="font-medium mt-2">Transform</div>
        <div className="flex items-center gap-2 mt-2">
          <button className="px-2 py-1 rounded border" onClick={() => engine.updateElement(el.id, { rotation: (el.rotation + 45) % 360 })}>Rotate +45</button>
          <button className="px-2 py-1 rounded border" onClick={() => engine.updateElement(el.id, { rotation: (el.rotation + 315) % 360 })}>Rotate -45</button>
          <button className="px-2 py-1 rounded border" onClick={() => engine.updateElement(el.id, { rotation: (el.rotation + 90) % 360 })}>Rotate +90</button>
          <button className="px-2 py-1 rounded border" onClick={() => engine.updateElement(el.id, { rotation: (el.rotation + 270) % 360 })}>Rotate -90</button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button className="px-2 py-1 rounded border" onClick={() => engine.updateElement(el.id, { flipV: !el.flipV })}>Flip Vertical</button>
          <button className="px-2 py-1 rounded border" onClick={() => engine.updateElement(el.id, { flipH: !el.flipH })}>Flip Horizontal</button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <label className="text-sm text-black/70">Z-index</label>
          <input title="Z-index" type="number" className="px-2 py-1 rounded border border-black/15 w-24" value={el.zIndex} onChange={(e) => engine.updateElement(el.id, { zIndex: Number(e.target.value) })} />
          <button className="px-2 py-1 rounded border ml-2" onClick={() => engine.updateElement(el.id, { locked: !el.locked })}>{el.locked ? 'Unlock' : 'Lock'}</button>
        </div>
      </div>
      
      <Row
        id={`${baseId}-rotation`}
        label="Rotation"
        control={numberInput(
          `${baseId}-rotation`,
          el.rotation,
          (v) => engine.updateElement(el.id, { rotation: v })
        )}
      />
      <Row
        id={`${baseId}-opacity`}
        label="Opacity"
        control={numberInput(
          `${baseId}-opacity`,
          el.opacity,
          (v) => engine.updateElement(el.id, { opacity: v })
        )}
      />
      <Row
        id={`${baseId}-stroke`}
        label="Stroke"
        control={
          <ColorInput
            id={`${baseId}-stroke`}
            value={el.stroke}
            onChange={(v) => engine.updateElement(el.id, { stroke: v })}
          />
        }
      />
      <Row
        id={`${baseId}-stroke-width`}
        label="Stroke W"
        control={numberInput(
          `${baseId}-stroke-width`,
          el.strokeWidth,
          (v) =>
            engine.updateElement(el.id, {
              strokeWidth: Math.max(0, v),
            })
        )}
      />
      <Row
        id={`${baseId}-fill`}
        label="Fill"
        control={
          <ColorInput
            id={`${baseId}-fill`}
            value={el.fill}
            onChange={(v) => engine.updateElement(el.id, { fill: v })}
          />
        }
      />

      <div className="col-span-2">
        <div className="font-medium mt-2">Event Listeners</div>
        <div className="flex items-center gap-2 mt-2">
          <input
            id={`${baseId}-hover-listener`}
            type="checkbox"
            checked={el.enableOnMouseHoverEventListener ?? false}
            onChange={(e) => engine.updateElement(el.id, { enableOnMouseHoverEventListener: e.target.checked })}
          />
          <label htmlFor={`${baseId}-hover-listener`} className="text-sm">Enable Hover Listener</label>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <input
            id={`${baseId}-click-listener`}
            type="checkbox"
            checked={el.enableOnMouseClickEventListener ?? false}
            onChange={(e) => engine.updateElement(el.id, { enableOnMouseClickEventListener: e.target.checked })}
          />
          <label htmlFor={`${baseId}-click-listener`} className="text-sm">Enable Click Listener</label>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <input
            id={`${baseId}-leave-listener`}
            type="checkbox"
            checked={el.enableOnMouseLeaveEventListener ?? false}
            onChange={(e) => engine.updateElement(el.id, { enableOnMouseLeaveEventListener: e.target.checked })}
          />
          <label htmlFor={`${baseId}-leave-listener`} className="text-sm">Enable Leave Listener</label>
        </div>
      </div>

      <div className="col-span-2">
        <div className="font-medium mt-2">MQTT Configuration</div>
        <Row
          id={`${baseId}-mqtt-topic`}
          label="MQTT Topic"
          control={textInput(
            `${baseId}-mqtt-topic`,
            el.mqttTopic ?? "",
            (v) => engine.updateElement(el.id, { mqttTopic: v })
          )}
        />
      </div>
    </>
  );

  if (el.type === "rect") {
    return (
      <div className="grid grid-cols-2 gap-2 items-center">
        <Row
          id={`${baseId}-x`}
          label="X"
          control={numberInput(`${baseId}-x`, el.x, (v) =>
            engine.updateElement(el.id, { x: v })
          )}
        />
        <Row
          id={`${baseId}-y`}
          label="Y"
          control={numberInput(`${baseId}-y`, el.y, (v) =>
            engine.updateElement(el.id, { y: v })
          )}
        />
        <Row
          id={`${baseId}-w`}
          label="W"
          control={numberInput(
            `${baseId}-w`,
            el.width,
            (v) =>
              engine.updateElement(el.id, {
                width: Math.max(1, v),
              })
          )}
        />
        <Row
          id={`${baseId}-h`}
          label="H"
          control={numberInput(
            `${baseId}-h`,
            el.height,
            (v) =>
              engine.updateElement(el.id, {
                height: Math.max(1, v),
              })
          )}
        />
        {common}
      </div>
    );
  }

  if (el.type === "circle") {
    return (
      <div className="grid grid-cols-2 gap-2 items-center">
        <Row
          id={`${baseId}-cx`}
          label="CX"
          control={numberInput(`${baseId}-cx`, el.cx, (v) =>
            engine.updateElement(el.id, { cx: v })
          )}
        />
        <Row
          id={`${baseId}-cy`}
          label="CY"
          control={numberInput(`${baseId}-cy`, el.cy, (v) =>
            engine.updateElement(el.id, { cy: v })
          )}
        />
        <Row
          id={`${baseId}-r`}
          label="R"
          control={numberInput(
            `${baseId}-r`,
            el.r,
            (v) =>
              engine.updateElement(el.id, {
                r: Math.max(1, v),
              })
          )}
        />
        {common}
      </div>
    );
  }

  if (el.type === "line") {
    return (
      <div className="grid grid-cols-2 gap-2 items-center">
        <Row
          id={`${baseId}-x1`}
          label="X1"
          control={numberInput(`${baseId}-x1`, el.x1, (v) =>
            engine.updateElement(el.id, { x1: v })
          )}
        />
        <Row
          id={`${baseId}-y1`}
          label="Y1"
          control={numberInput(`${baseId}-y1`, el.y1, (v) =>
            engine.updateElement(el.id, { y1: v })
          )}
        />
        <Row
          id={`${baseId}-x2`}
          label="X2"
          control={numberInput(`${baseId}-x2`, el.x2, (v) =>
            engine.updateElement(el.id, { x2: v })
          )}
        />
        <Row
          id={`${baseId}-y2`}
          label="Y2"
          control={numberInput(`${baseId}-y2`, el.y2, (v) =>
            engine.updateElement(el.id, { y2: v })
          )}
        />
        {common}
      </div>
    );
  }

  if (el.type === "image") {
    return (
      <div className="grid grid-cols-2 gap-2 items-center">
        <Row
          id={`${baseId}-x`}
          label="X"
          control={numberInput(`${baseId}-x`, el.x, (v) =>
            engine.updateElement(el.id, { x: v })
          )}
        />
        <Row
          id={`${baseId}-y`}
          label="Y"
          control={numberInput(`${baseId}-y`, el.y, (v) =>
            engine.updateElement(el.id, { y: v })
          )}
        />
        <Row
          id={`${baseId}-w`}
          label="W"
          control={numberInput(
            `${baseId}-w`,
            el.width,
            (v) =>
              engine.updateElement(el.id, {
                width: Math.max(1, v),
              })
          )}
        />
        <Row
          id={`${baseId}-h`}
          label="H"
          control={numberInput(
            `${baseId}-h`,
            el.height,
            (v) =>
              engine.updateElement(el.id, {
                height: Math.max(1, v),
              })
          )}
        />
        <Row
          id={`${baseId}-href`}
          label="Href"
          control={textInput(
            `${baseId}-href`,
            el.href,
            (v) => engine.updateElement(el.id, { href: v })
          )}
        />
        <Row
          id={`${baseId}-aspect`}
          label="Aspect"
          control={textInput(
            `${baseId}-aspect`,
            el.preserveAspectRatio,
            (v) =>
              engine.updateElement(el.id, {
                preserveAspectRatio: v,
              })
          )}
        />
        <Row
          id={`${baseId}-fit`}
          label="Fit"
          control={
            <select
              id={`${baseId}-fit`}
              value={el.fit ?? "none"}
              onChange={(e) => {
                const v = e.target.value as "none" | "contain" | "cover" | "stretch";
                let pra = "xMidYMid meet";
                if (v === "cover") pra = "xMidYMid slice";
                if (v === "stretch") pra = "none";
                engine.updateElement(el.id, { fit: v, preserveAspectRatio: pra });
              }}
              className="px-2 py-1 rounded border border-black/15 w-full"
            >
              <option value="none">None</option>
              <option value="contain">Contain</option>
              <option value="stretch">Stretch</option>
              <option value="cover">Cover</option>
            </select>
          }
        />

        <div className="col-span-2 flex items-center gap-2">
          <button
            className="px-2 py-1 rounded border border-black/15"
            onClick={() => {
              // Scale element to its natural size if available
              const nw = (el as ImageElement).naturalWidth as number | undefined;
              const nh = (el as ImageElement).naturalHeight as number | undefined;
              if (nw && nh) engine.updateElement(el.id, { width: nw, height: nh });
            }}
          >
            Scale to natural
          </button>
          <button
            className="px-2 py-1 rounded border border-black/15"
            onClick={() => {
              // Fit image inside current box using contain (preserveAspectRatio)
              engine.updateElement(el.id, { fit: "contain", preserveAspectRatio: "xMidYMid meet" });
            }}
          >
            Fit to box
          </button>
        </div>
        {common}
      </div>
    );
  }

  if (el.type === "text") {
    const t = el as TextElement;
    return (
      <div className="grid grid-cols-2 gap-2 items-center">
        <Row id={`${baseId}-x`} label="X" control={numberInput(`${baseId}-x`, t.x, (v) => engine.updateElement(el.id, { x: v }))} />
        <Row id={`${baseId}-y`} label="Y" control={numberInput(`${baseId}-y`, t.y, (v) => engine.updateElement(el.id, { y: v }))} />
        <div className="col-span-2">
          <Row id={`${baseId}-text`} label="Text" control={textAreaInput(`${baseId}-text`, t.text, (v) => engine.updateElement(el.id, { text: v }))} />
        </div>
        <Row id={`${baseId}-font-size`} label="Font Size" control={numberInput(`${baseId}-font-size`, t.fontSize, (v) => engine.updateElement(el.id, { fontSize: Math.max(1, v) }))} />
        <Row id={`${baseId}-font-weight`} label="Weight" control={
          <select id={`${baseId}-font-weight`} value={t.fontWeight} onChange={(e) => engine.updateElement(el.id, { fontWeight: e.target.value })} className="px-2 py-1 rounded border border-black/15 w-full">
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
          </select>
        } />
        <Row id={`${baseId}-font-color`} label="Color" control={<ColorInput id={`${baseId}-font-color`} value={t.fill} onChange={(v) => engine.updateElement(el.id, { fill: v })} />} />
        <div className="col-span-2 flex items-center gap-2">
          <button className="px-2 py-1 rounded border" onClick={() => engine.updateElement(el.id, { fontWeight: t.fontWeight === 'bold' ? 'normal' : 'bold' })}>Bold</button>
          <button className="px-2 py-1 rounded border" onClick={() => engine.updateElement(el.id, { fontStyle: t.fontStyle === 'italic' ? 'normal' : 'italic' })}>Italic</button>
          <button className="px-2 py-1 rounded border" onClick={() => engine.updateElement(el.id, { textDecoration: t.textDecoration === 'underline' ? 'none' : 'underline' })}>Underline</button>
        </div>
        {common}
      </div>
    );
  }

  if (el.type === "free") {
    return (
      <div className="grid grid-cols-2 gap-2 items-center">
        <Row
          id={`${baseId}-path`}
          label="Path"
          control={textInput(
            `${baseId}-path`,
            el.d,
            (v) => engine.updateElement(el.id, { d: v })
          )}
        />
        {common}
      </div>
    );
  }

  if (el.type === "custom") {
    const c = el as CustomElement;

    // Handle webEmbed specifically
    if (c.kind === "webEmbed") {
      const props = c.props || {};
      return (
        <div className="grid grid-cols-2 gap-2 items-center">
          <Row
            id={`${baseId}-x`}
            label="X"
            control={numberInput(`${baseId}-x`, c.x, (v) =>
              engine.updateElement(el.id, { x: v })
            )}
          />
          <Row
            id={`${baseId}-y`}
            label="Y"
            control={numberInput(`${baseId}-y`, c.y, (v) =>
              engine.updateElement(el.id, { y: v })
            )}
          />
          <Row
            id={`${baseId}-w`}
            label="W"
            control={numberInput(
              `${baseId}-w`,
              c.width,
              (v) =>
                engine.updateElement(el.id, {
                  width: Math.max(1, v),
                })
            )}
          />
          <Row
            id={`${baseId}-h`}
            label="H"
            control={numberInput(
              `${baseId}-h`,
              c.height,
              (v) =>
                engine.updateElement(el.id, {
                  height: Math.max(1, v),
                })
            )}
          />

          <Row
            id={`${baseId}-url`}
            label="URL"
            control={textInput(`${baseId}-url`, String(props.url || ""), (v) => {
              const normalizedUrl = normalizeUrl(v);
              const newProps = { ...props, url: normalizedUrl };
              engine.updateElement(el.id, { props: newProps });
            })}
          />
          <Row
            id={`${baseId}-title`}
            label="Title"
            control={textInput(`${baseId}-title`, String(props.title || ""), (v) => {
              const newProps = { ...props, title: v };
              engine.updateElement(el.id, { props: newProps });
            })}
          />
          <Row
            id={`${baseId}-allow-fullscreen`}
            label="Allow Fullscreen"
            control={
              <input
                id={`${baseId}-allow-fullscreen`}
                type="checkbox"
                checked={Boolean(props.allowFullscreen)}
                onChange={(e) => {
                  const newProps = { ...props, allowFullscreen: e.target.checked };
                  engine.updateElement(el.id, { props: newProps });
                }}
              />
            }
          />
          <Row
            id={`${baseId}-allow-scripts`}
            label="Allow Scripts"
            control={
              <input
                id={`${baseId}-allow-scripts`}
                type="checkbox"
                checked={Boolean(props.allowScripts)}
                onChange={(e) => {
                  const newProps = { ...props, allowScripts: e.target.checked };
                  engine.updateElement(el.id, { props: newProps });
                }}
              />
            }
          />

          {/* Reload button */}
          <div className="col-span-2 flex gap-2 mt-2">
            <button
              className="px-3 py-1 rounded border border-black/15 hover:bg-black/5"
              onClick={() => {
                const newProps = { ...props, reloadTrigger: Date.now() };
                engine.updateElement(el.id, { props: newProps });
              }}
            >
              Reload
            </button>
          </div>

          {common}
        </div>
      );
    }

    // Generic custom element handling
    const customProps = c.props || {};
    return (
      <div className="grid grid-cols-2 gap-2 items-center">
        <Row
          id={`${baseId}-x`}
          label="X"
          control={numberInput(`${baseId}-x`, c.x, (v) =>
            engine.updateElement(el.id, { x: v })
          )}
        />
        <Row
          id={`${baseId}-y`}
          label="Y"
          control={numberInput(`${baseId}-y`, c.y, (v) =>
            engine.updateElement(el.id, { y: v })
          )}
        />
        <Row
          id={`${baseId}-w`}
          label="W"
          control={numberInput(
            `${baseId}-w`,
            c.width,
            (v) =>
              engine.updateElement(el.id, {
                width: Math.max(1, v),
              })
          )}
        />
        <Row
          id={`${baseId}-h`}
          label="H"
          control={numberInput(
            `${baseId}-h`,
            c.height,
            (v) =>
              engine.updateElement(el.id, {
                height: Math.max(1, v),
              })
          )}
        />
        {common}
        {/* Custom props */}
        {Object.keys(customProps).length > 0 && (
          <>
            <div className="col-span-2 font-medium mt-2">Custom Properties</div>
            {Object.entries(customProps).map(([key, value]) => (
              <Row
                key={key}
                id={`${baseId}-prop-${key}`}
                label={key}
                control={
                  typeof value === "number" ? numberInput(`${baseId}-prop-${key}`, value, (v) => {
                    const newProps = { ...customProps, [key]: v };
                    engine.updateElement(el.id, { props: newProps });
                  }) :
                  typeof value === "string" ? textInput(`${baseId}-prop-${key}`, value, (v) => {
                    const newProps = { ...customProps, [key]: v };
                    engine.updateElement(el.id, { props: newProps });
                  }) :
                  <span>{String(value)}</span>
                }
              />
            ))}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="text-sm text-black/60">Group</div>
  );
}

/* =========================
   Row (label + control)
   ========================= */

function Row({
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
      <label
        htmlFor={id}
        className="text-sm text-black/70"
      >
        {label}
      </label>
      {control}
    </>
  );
}
