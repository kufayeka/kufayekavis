"use client";

import { useSyncExternalStore } from "react";
import type React from "react";
import type { DesignerEngine, DesignerState } from "../../core/engine";
import type { DesignerElement, CustomElement } from "../../core/types";
import { useDesignerHost } from "../hooks/useDesignerHost";

import { ColorInput, numberInput, Row, textInput } from "./properties/controls";

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

  const maybeCustomProps =
    el.type === "custom" ? (
      (() => {
        const c = el as CustomElement;
        const customProps = c.props || {};
        if (Object.keys(customProps).length === 0) return null;
        return (
          <>
            <div className="col-span-2 font-medium mt-2">Custom Properties</div>
            {Object.entries(customProps).map(([key, value]) => (
              <Row
                key={key}
                id={`${baseId}-prop-${key}`}
                label={key}
                control={
                  typeof value === "number"
                    ? numberInput(`${baseId}-prop-${key}`, value, (v) => {
                        const newProps = { ...customProps, [key]: v };
                        engine.updateElement(el.id, { props: newProps });
                      })
                    : typeof value === "string"
                      ? textInput(`${baseId}-prop-${key}`, value, (v) => {
                          const newProps = { ...customProps, [key]: v };
                          engine.updateElement(el.id, { props: newProps });
                        })
                      : (<span>{String(value)}</span>)
                }
              />
            ))}
          </>
        );
      })()
    ) : null;

  return (
    <div className="grid grid-cols-2 gap-2 items-center">
      {el.type === "group" && (
        <div className="col-span-2 text-sm text-black/60">Group</div>
      )}
      {common}
      {maybeCustomProps}
    </div>
  );
}
