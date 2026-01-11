import type React from "react";
import { isValidElement } from "react";

import type { DesignerAPI } from "../../../core/api";
import type { DesignerState } from "../../../core/engine";
import type { DesignerElement, ElementId } from "../../../core/types";

export function RenderTree({
  doc,
  rootIds,
  onRegister,
  renderCustom,
  renderNativeByDefinition,
  api,
  runtimePatches,
}: {
  doc: DesignerState["doc"];
  rootIds: ElementId[];
  onRegister: (id: ElementId, node: SVGElement | null) => void;
  renderCustom: (el: DesignerElement, doc: DesignerState["doc"]) => React.ReactNode;
  renderNativeByDefinition?: (el: DesignerElement, doc: DesignerState["doc"]) => React.ReactNode;
  api: DesignerAPI;
  runtimePatches?: Record<ElementId, Partial<DesignerElement>>;
}) {
  const applyRuntimePatch = (el: DesignerElement): DesignerElement => {
    const patch = runtimePatches?.[el.id];
    if (!patch) return el;
    const merged = { ...el, ...patch } as DesignerElement;
    if (el.type === "custom") {
      const baseProps = (el.props ?? {}) as Record<string, unknown>;
      const patchProps = (patch as unknown as { props?: unknown }).props;
      if (patchProps && typeof patchProps === "object" && !Array.isArray(patchProps)) {
        (merged as unknown as { props: Record<string, unknown> }).props = { ...baseProps, ...(patchProps as Record<string, unknown>) };
      }
    }
    return merged;
  };

  const sorted = [...rootIds]
    .map((id) => doc.elements[id])
    .filter(Boolean)
    .map((el) => applyRuntimePatch(el as DesignerElement))
    .sort((a, b) => (a!.zIndex ?? 0) - (b!.zIndex ?? 0)) as DesignerElement[];

  const mqtt = api.getPluginSettings("system.mqttScada") as unknown;
  const forcePublishElementEvents =
    mqtt && typeof mqtt === "object" && "forcePublishElementEvents" in (mqtt as Record<string, unknown>)
      ? Boolean((mqtt as Record<string, unknown>).forcePublishElementEvents)
      : false;

  return (
    <>
      {sorted.map((el) => (
        <RenderElement
          key={el.id}
          el={el}
          doc={doc}
          onRegister={onRegister}
          renderCustom={renderCustom}
          renderNativeByDefinition={renderNativeByDefinition}
          api={api}
          forcePublishElementEvents={forcePublishElementEvents}
          runtimePatches={runtimePatches}
        />
      ))}
    </>
  );
}

function RenderElement({
  el,
  doc,
  onRegister,
  renderCustom,
  renderNativeByDefinition,
  api,
  forcePublishElementEvents,
  runtimePatches,
}: {
  el: DesignerElement;
  doc: DesignerState["doc"];
  onRegister: (id: ElementId, node: SVGElement | null) => void;
  renderCustom: (el: DesignerElement, doc: DesignerState["doc"]) => React.ReactNode;
  renderNativeByDefinition?: (el: DesignerElement, doc: DesignerState["doc"]) => React.ReactNode;
  api: DesignerAPI;
  forcePublishElementEvents: boolean;
  runtimePatches?: Record<ElementId, Partial<DesignerElement>>;
}) {
  if (el.hidden) return null;

  const applyRuntimePatch = (src: DesignerElement): DesignerElement => {
    const patch = runtimePatches?.[src.id];
    if (!patch) return src;
    const merged = { ...src, ...patch } as DesignerElement;
    if (src.type === "custom") {
      const baseProps = (src.props ?? {}) as Record<string, unknown>;
      const patchProps = (patch as unknown as { props?: unknown }).props;
      if (patchProps && typeof patchProps === "object" && !Array.isArray(patchProps)) {
        (merged as unknown as { props: Record<string, unknown> }).props = { ...baseProps, ...(patchProps as Record<string, unknown>) };
      }
    }
    return merged;
  };

  const elPatched = applyRuntimePatch(el);

  const getTransform = (cx: number, cy: number) => {
    const parts: string[] = [];
    const meta = elPatched as unknown as { flipH?: boolean; flipV?: boolean };
    if (meta.flipH || meta.flipV) {
      const sx = meta.flipH ? -1 : 1;
      const sy = meta.flipV ? -1 : 1;
      parts.push(`translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`);
    }
    if (elPatched.rotation) parts.push(`rotate(${elPatched.rotation} ${cx} ${cy})`);
    return parts.length ? parts.join(" ") : undefined;
  };

  const getTransformForElement = (): string | undefined => {
    if (elPatched.type === "rect" || elPatched.type === "image" || elPatched.type === "custom") {
      const cx = elPatched.x + elPatched.width / 2;
      const cy = elPatched.y + elPatched.height / 2;
      return getTransform(cx, cy);
    }

    if (elPatched.type === "circle") {
      return getTransform(elPatched.cx, elPatched.cy);
    }

    if (elPatched.type === "line") {
      const cx = (elPatched.x1 + elPatched.x2) / 2;
      const cy = (elPatched.y1 + elPatched.y2) / 2;
      return getTransform(cx, cy);
    }

    if (elPatched.type === "text") {
      return getTransform(elPatched.x, elPatched.y);
    }

    // free + group: no transform center defined here
    return undefined;
  };

  if (elPatched.type === "group") {
    const children = elPatched.childIds
      .map((id) => doc.elements[id])
      .filter(Boolean)
      .map((child) => applyRuntimePatch(child as DesignerElement))
      .sort((a, b) => (a!.zIndex ?? 0) - (b!.zIndex ?? 0)) as DesignerElement[];

    return (
      <g ref={(node) => onRegister(elPatched.id, node)} data-el-id={elPatched.id}>
        {children.map((child) => (
          <RenderElement
            key={child.id}
            el={child}
            doc={doc}
            onRegister={onRegister}
            renderCustom={renderCustom}
            api={api}
            forcePublishElementEvents={forcePublishElementEvents}
            runtimePatches={runtimePatches}
          />
        ))}
      </g>
    );
  }

  if (elPatched.type !== "custom" && renderNativeByDefinition) {
    const rendered = renderNativeByDefinition(elPatched, doc);
    if (isValidElement(rendered)) {
      return (
        <g
          ref={(node) => onRegister(elPatched.id, node)}
          data-el-id={elPatched.id}
          opacity={elPatched.opacity}
          transform={getTransformForElement()}
          className="cursor-move"
          onMouseEnter={
            forcePublishElementEvents || elPatched.enableOnMouseHoverEventListener
              ? () => api.publishEvent(elPatched.mqttTopic || "default/events", { eventType: "onMouseEnter", sourceElement: elPatched.id })
              : undefined
          }
          onClick={
            forcePublishElementEvents || elPatched.enableOnMouseClickEventListener
              ? () => api.publishEvent(elPatched.mqttTopic || "default/events", { eventType: "onClick", sourceElement: elPatched.id })
              : undefined
          }
          onMouseLeave={
            forcePublishElementEvents || elPatched.enableOnMouseLeaveEventListener
              ? () => api.publishEvent(elPatched.mqttTopic || "default/events", { eventType: "onMouseLeave", sourceElement: elPatched.id })
              : undefined
          }
        >
          {rendered}
        </g>
      );
    }
  }

  if (elPatched.type === "custom") {
    const cx = elPatched.x + elPatched.width / 2;
    const cy = elPatched.y + elPatched.height / 2;
    const transform = getTransform(cx, cy);
    const content = renderCustom(elPatched, doc);

    return (
      <g
        ref={(node) => onRegister(elPatched.id, node)}
        data-el-id={elPatched.id}
        opacity={elPatched.opacity}
        transform={transform}
        className="cursor-move"
        onMouseEnter={
          forcePublishElementEvents || elPatched.enableOnMouseHoverEventListener
            ? () => api.publishEvent(elPatched.mqttTopic || "default/events", { eventType: "onMouseEnter", sourceElement: elPatched.id })
            : undefined
        }
        onClick={
          forcePublishElementEvents || elPatched.enableOnMouseClickEventListener
            ? () => api.publishEvent(elPatched.mqttTopic || "default/events", { eventType: "onClick", sourceElement: elPatched.id })
            : undefined
        }
        onMouseLeave={
          forcePublishElementEvents || elPatched.enableOnMouseLeaveEventListener
            ? () => api.publishEvent(elPatched.mqttTopic || "default/events", { eventType: "onMouseLeave", sourceElement: elPatched.id })
            : undefined
        }
      >
        <svg
          x={elPatched.x}
          y={elPatched.y}
          width={elPatched.width}
          height={elPatched.height}
          viewBox={`0 0 ${Math.max(1, elPatched.width)} ${Math.max(1, elPatched.height)}`}
          preserveAspectRatio="none"
          overflow="visible"
        >
          {content}
        </svg>
      </g>
    );
  }

  return null;
}
