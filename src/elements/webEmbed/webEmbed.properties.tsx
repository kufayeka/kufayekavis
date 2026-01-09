"use client";

import type React from "react";

import type { CustomElement } from "../../designer/core/types";
import type { PropertiesSectionRenderCtx } from "../../designer/ui/components/properties/types";
import { Row, numberInput, normalizeUrl, textInput } from "../../designer/ui/components/properties/controls";
import { WEB_EMBED_ACTION_IDS } from "./webEmbed.actions";

export function renderWebEmbedProperties(ctxUnknown: unknown): React.ReactNode {
  const { api, engine, state } = ctxUnknown as PropertiesSectionRenderCtx;
  const selectedId = state.selection.ids.length === 1 ? state.selection.ids[0] : null;
  const el = selectedId ? state.doc.elements[selectedId] : null;
  if (!el || el.type !== "custom") return null;

  const c = el as CustomElement;
  if (c.kind !== "webEmbed") return null;

  const props = (c.props || {}) as Record<string, unknown>;
  const baseId = `el-${c.id}`;
  const allowFullscreenId = `${baseId}-webEmbed-allowFullscreen`;
  const allowScriptsId = `${baseId}-webEmbed-allowScripts`;

  return (
    <div className="grid grid-cols-2 gap-2 items-center">
      <Row id={`${baseId}-x`} label="X" control={numberInput(`${baseId}-x`, c.x, (v) => engine.updateElement(c.id, { x: v }))} />
      <Row id={`${baseId}-y`} label="Y" control={numberInput(`${baseId}-y`, c.y, (v) => engine.updateElement(c.id, { y: v }))} />
      <Row id={`${baseId}-w`} label="W" control={numberInput(`${baseId}-w`, c.width, (v) => engine.updateElement(c.id, { width: Math.max(1, v) }))} />
      <Row id={`${baseId}-h`} label="H" control={numberInput(`${baseId}-h`, c.height, (v) => engine.updateElement(c.id, { height: Math.max(1, v) }))} />

      <Row
        id={`${baseId}-webEmbed-url`}
        label="URL"
        control={
          textInput(`${baseId}-webEmbed-url`, String(props.url || ""), (v) => {
            const normalizedUrl = normalizeUrl(v);
            const newProps = { ...props, url: normalizedUrl };
            engine.updateElement(c.id, { props: newProps });
          })
        }
      />
      <Row
        id={`${baseId}-webEmbed-title`}
        label="Title"
        control={
          textInput(`${baseId}-webEmbed-title`, String(props.title || ""), (v) => {
            const newProps = { ...props, title: v };
            engine.updateElement(c.id, { props: newProps });
          })
        }
      />

      <div className="col-span-2">
        <div className="flex items-center gap-2">
          <input
            id={allowFullscreenId}
            type="checkbox"
            title="Allow Fullscreen"
            checked={Boolean(props.allowFullscreen)}
            onChange={(e) => {
              const newProps = { ...props, allowFullscreen: e.target.checked };
              engine.updateElement(c.id, { props: newProps });
            }}
          />
          <label htmlFor={allowFullscreenId} className="text-sm">
            Allow Fullscreen
          </label>
        </div>
      </div>
      <div className="col-span-2">
        <div className="flex items-center gap-2">
          <input
            id={allowScriptsId}
            type="checkbox"
            title="Allow Scripts"
            checked={Boolean(props.allowScripts)}
            onChange={(e) => {
              const newProps = { ...props, allowScripts: e.target.checked };
              engine.updateElement(c.id, { props: newProps });
            }}
          />
          <label htmlFor={allowScriptsId} className="text-sm">
            Allow Scripts
          </label>
        </div>
      </div>

      <div className="col-span-2 flex gap-2 mt-2">
        <button
          className="px-3 py-1 rounded border border-black/15 hover:bg-black/5"
          onClick={() => {
            api.callElementAction(c.id, WEB_EMBED_ACTION_IDS.reload);
          }}
        >
          Reload
        </button>
      </div>
    </div>
  );
}
