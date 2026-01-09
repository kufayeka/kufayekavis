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
}: {
  doc: DesignerState["doc"];
  rootIds: ElementId[];
  onRegister: (id: ElementId, node: SVGElement | null) => void;
  renderCustom: (el: DesignerElement, doc: DesignerState["doc"]) => React.ReactNode;
  renderNativeByDefinition?: (el: DesignerElement, doc: DesignerState["doc"]) => React.ReactNode;
  api: DesignerAPI;
}) {
  const sorted = [...rootIds]
    .map((id) => doc.elements[id])
    .filter(Boolean)
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
}: {
  el: DesignerElement;
  doc: DesignerState["doc"];
  onRegister: (id: ElementId, node: SVGElement | null) => void;
  renderCustom: (el: DesignerElement, doc: DesignerState["doc"]) => React.ReactNode;
  renderNativeByDefinition?: (el: DesignerElement, doc: DesignerState["doc"]) => React.ReactNode;
  api: DesignerAPI;
  forcePublishElementEvents: boolean;
}) {
  if (el.hidden) return null;

  const getTransform = (cx: number, cy: number) => {
    const parts: string[] = [];
    const meta = el as unknown as { flipH?: boolean; flipV?: boolean };
    if (meta.flipH || meta.flipV) {
      const sx = meta.flipH ? -1 : 1;
      const sy = meta.flipV ? -1 : 1;
      parts.push(`translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`);
    }
    if (el.rotation) parts.push(`rotate(${el.rotation} ${cx} ${cy})`);
    return parts.length ? parts.join(" ") : undefined;
  };

  const getTransformForElement = (): string | undefined => {
    if (el.type === "rect" || el.type === "image" || el.type === "custom") {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      return getTransform(cx, cy);
    }

    if (el.type === "circle") {
      return getTransform(el.cx, el.cy);
    }

    if (el.type === "line") {
      const cx = (el.x1 + el.x2) / 2;
      const cy = (el.y1 + el.y2) / 2;
      return getTransform(cx, cy);
    }

    if (el.type === "text") {
      return getTransform(el.x, el.y);
    }

    // free + group: no transform center defined here
    return undefined;
  };

  if (el.type === "group") {
    const children = el.childIds
      .map((id) => doc.elements[id])
      .filter(Boolean)
      .sort((a, b) => (a!.zIndex ?? 0) - (b!.zIndex ?? 0)) as DesignerElement[];

    return (
      <g ref={(node) => onRegister(el.id, node)} data-el-id={el.id}>
        {children.map((child) => (
          <RenderElement
            key={child.id}
            el={child}
            doc={doc}
            onRegister={onRegister}
            renderCustom={renderCustom}
            api={api}
            forcePublishElementEvents={forcePublishElementEvents}
          />
        ))}
      </g>
    );
  }

  if (el.type !== "custom" && renderNativeByDefinition) {
    const rendered = renderNativeByDefinition(el, doc);
    if (isValidElement(rendered)) {
      return (
        <g
          ref={(node) => onRegister(el.id, node)}
          data-el-id={el.id}
          opacity={el.opacity}
          transform={getTransformForElement()}
          className="cursor-move"
          onMouseEnter={
            forcePublishElementEvents || el.enableOnMouseHoverEventListener
              ? () => api.publishEvent(el.mqttTopic || "default/events", { eventType: "onMouseEnter", sourceElement: el.id })
              : undefined
          }
          onClick={
            forcePublishElementEvents || el.enableOnMouseClickEventListener
              ? () => api.publishEvent(el.mqttTopic || "default/events", { eventType: "onClick", sourceElement: el.id })
              : undefined
          }
          onMouseLeave={
            forcePublishElementEvents || el.enableOnMouseLeaveEventListener
              ? () => api.publishEvent(el.mqttTopic || "default/events", { eventType: "onMouseLeave", sourceElement: el.id })
              : undefined
          }
        >
          {rendered}
        </g>
      );
    }
  }

  if (el.type === "custom") {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const transform = getTransform(cx, cy);
    const content = renderCustom(el, doc);

    return (
      <g
        ref={(node) => onRegister(el.id, node)}
        data-el-id={el.id}
        opacity={el.opacity}
        transform={transform}
        className="cursor-move"
        onMouseEnter={
          forcePublishElementEvents || el.enableOnMouseHoverEventListener
            ? () => api.publishEvent(el.mqttTopic || "default/events", { eventType: "onMouseEnter", sourceElement: el.id })
            : undefined
        }
        onClick={
          forcePublishElementEvents || el.enableOnMouseClickEventListener
            ? () => api.publishEvent(el.mqttTopic || "default/events", { eventType: "onClick", sourceElement: el.id })
            : undefined
        }
        onMouseLeave={
          forcePublishElementEvents || el.enableOnMouseLeaveEventListener
            ? () => api.publishEvent(el.mqttTopic || "default/events", { eventType: "onMouseLeave", sourceElement: el.id })
            : undefined
        }
      >
        <svg
          x={el.x}
          y={el.y}
          width={el.width}
          height={el.height}
          viewBox={`0 0 ${Math.max(1, el.width)} ${Math.max(1, el.height)}`}
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
