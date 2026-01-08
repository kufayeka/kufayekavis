import type React from "react";

import type { DesignerAPI } from "../../../core/api";
import type { DesignerState } from "../../../core/engine";
import type { DesignerElement, ElementId } from "../../../core/types";

export function RenderTree({
  doc,
  rootIds,
  onRegister,
  renderCustom,
  api,
}: {
  doc: DesignerState["doc"];
  rootIds: ElementId[];
  onRegister: (id: ElementId, node: SVGElement | null) => void;
  renderCustom: (el: DesignerElement, doc: DesignerState["doc"]) => React.ReactNode;
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
  api,
  forcePublishElementEvents,
}: {
  el: DesignerElement;
  doc: DesignerState["doc"];
  onRegister: (id: ElementId, node: SVGElement | null) => void;
  renderCustom: (el: DesignerElement, doc: DesignerState["doc"]) => React.ReactNode;
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

  const opacity = el.opacity;

  if (el.type === "rect") {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    return (
      <rect
        ref={(node) => onRegister(el.id, node)}
        data-el-id={el.id}
        x={el.x}
        y={el.y}
        width={el.width}
        height={el.height}
        rx={el.rx}
        ry={el.ry}
        fill={el.fill}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        opacity={opacity}
        transform={getTransform(cx, cy)}
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
      />
    );
  }

  if (el.type === "circle") {
    return (
      <circle
        ref={(node) => onRegister(el.id, node)}
        data-el-id={el.id}
        cx={el.cx}
        cy={el.cy}
        r={el.r}
        fill={el.fill}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        opacity={opacity}
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
      />
    );
  }

  if (el.type === "line") {
    const cx = (el.x1 + el.x2) / 2;
    const cy = (el.y1 + el.y2) / 2;
    return (
      <line
        ref={(node) => onRegister(el.id, node)}
        data-el-id={el.id}
        x1={el.x1}
        y1={el.y1}
        x2={el.x2}
        y2={el.y2}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        opacity={opacity}
        transform={getTransform(cx, cy)}
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
      />
    );
  }

  if (el.type === "free") {
    return (
      <path
        ref={(node) => onRegister(el.id, node)}
        data-el-id={el.id}
        d={el.d}
        fill={"none"}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        opacity={opacity}
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
      />
    );
  }

  if (el.type === "image") {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const pra = el.fit === "stretch" ? "none" : el.preserveAspectRatio;
    const transform = getTransform(cx, cy);
    return (
      <image
        ref={(node) => onRegister(el.id, node)}
        data-el-id={el.id}
        href={el.href}
        x={el.x}
        y={el.y}
        width={el.width}
        height={el.height}
        preserveAspectRatio={pra}
        opacity={opacity}
        transform={transform}
        className="cursor-move"
        role="img"
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
        <title>{el.name?.trim() ? el.name : "Image"}</title>
      </image>
    );
  }

  if (el.type === "text") {
    const t = el as unknown as {
      x: number;
      y: number;
      text: string;
      fontSize: number;
      fontWeight: string;
      fontStyle?: string;
      textDecoration?: string;
      fill: string;
      opacity: number;
    };
    const cx = t.x;
    const cy = t.y;
    const transform = getTransform(cx, cy);
    return (
      <text
        ref={(node) => onRegister(el.id, node)}
        data-el-id={el.id}
        x={t.x}
        y={t.y}
        fontSize={t.fontSize}
        fontWeight={t.fontWeight}
        fontStyle={t.fontStyle}
        textDecoration={t.textDecoration}
        fill={t.fill}
        opacity={t.opacity}
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
        {t.text}
      </text>
    );
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
        opacity={opacity}
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
