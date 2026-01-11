"use client";

import { useSyncExternalStore } from "react";
import type React from "react";
import type { DesignerEngine, DesignerState } from "../../core/engine";
import type { DesignerElement, CustomElement } from "../../core/types";
import { useDesignerHost } from "../hooks/useDesignerHost";

import { Button, ButtonGroup, Checkbox, FormControlLabel, TextField } from "@mui/material";

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
      {/* Selection */}
      <div className="rounded border border-black/15 p-3 space-y-3">
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
            <TextField id={`${baseId}-id`} fullWidth value={el.id} slotProps={{ input: { readOnly: true } }} />
            <Button onClick={() => navigator.clipboard?.writeText(el.id)} aria-label="Copy element id">
              Copy
            </Button>
          </div>
        }
      />

        <Row
          id={`${baseId}-tag`}
          label="Tag"
          control={
            <div className="flex items-center gap-2">
              <TextField
                id={`${baseId}-tag`}
                fullWidth
                value={el.tag ?? ""}
                onChange={(e) => engine.updateElement(el.id, { tag: e.target.value })}
              />
              <Button
                onClick={() => navigator.clipboard?.writeText(String(el.tag ?? ""))}
                aria-label="Copy element tag"
                disabled={!String(el.tag ?? "").trim()}
              >
                Copy
              </Button>
            </div>
          }
        />
      
        <div className="font-medium mt-2">Transform</div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <ButtonGroup>
            <Button onClick={() => engine.updateElement(el.id, { rotation: (el.rotation + 45) % 360 })}>Rotate +45</Button>
            <Button onClick={() => engine.updateElement(el.id, { rotation: (el.rotation + 315) % 360 })}>Rotate -45</Button>
            <Button onClick={() => engine.updateElement(el.id, { rotation: (el.rotation + 90) % 360 })}>Rotate +90</Button>
            <Button onClick={() => engine.updateElement(el.id, { rotation: (el.rotation + 270) % 360 })}>Rotate -90</Button>
          </ButtonGroup>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <ButtonGroup>
            <Button onClick={() => engine.updateElement(el.id, { flipV: !el.flipV })}>Flip Vertical</Button>
            <Button onClick={() => engine.updateElement(el.id, { flipH: !el.flipH })}>Flip Horizontal</Button>
          </ButtonGroup>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <label className="text-sm text-black/70">Z-index</label>
          <TextField
            title="Z-index"
            type="number"
            className="w-24"
            value={el.zIndex}
            onChange={(e) => engine.updateElement(el.id, { zIndex: Number(e.target.value) })}
          />
          <Button className="ml-2" onClick={() => engine.updateElement(el.id, { locked: !el.locked })}>
            {el.locked ? "Unlock" : "Lock"}
          </Button>
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
        <div className="flex flex-col gap-1 mt-2">
          <FormControlLabel
            control={
              <Checkbox
                id={`${baseId}-hover-listener`}
                checked={el.enableOnMouseHoverEventListener ?? false}
                onChange={(e) => engine.updateElement(el.id, { enableOnMouseHoverEventListener: e.target.checked })}
              />
            }
            label="Enable Hover Listener"
          />
          <FormControlLabel
            control={
              <Checkbox
                id={`${baseId}-click-listener`}
                checked={el.enableOnMouseClickEventListener ?? false}
                onChange={(e) => engine.updateElement(el.id, { enableOnMouseClickEventListener: e.target.checked })}
              />
            }
            label="Enable Click Listener"
          />
          <FormControlLabel
            control={
              <Checkbox
                id={`${baseId}-leave-listener`}
                checked={el.enableOnMouseLeaveEventListener ?? false}
                onChange={(e) => engine.updateElement(el.id, { enableOnMouseLeaveEventListener: e.target.checked })}
              />
            }
            label="Enable Leave Listener"
          />
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
