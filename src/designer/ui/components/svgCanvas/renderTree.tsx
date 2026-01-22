import type React from "react";
import { memo } from "react";
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
  viewMode,
  runtimePatches,
}: {
  doc: DesignerState["doc"];
  rootIds: ElementId[];
  onRegister: (id: ElementId, node: SVGElement | null) => void;
  renderCustom: (el: DesignerElement, doc: DesignerState["doc"]) => React.ReactNode;
  renderNativeByDefinition?: (el: DesignerElement, doc: DesignerState["doc"]) => React.ReactNode;
  api: DesignerAPI;
  viewMode?: boolean;
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
          viewMode={viewMode}
          runtimePatches={runtimePatches}
        />
      ))}
    </>
  );
}

const RenderElement = memo(function RenderElement({
  el,
  doc,
  onRegister,
  renderCustom,
  renderNativeByDefinition,
  api,
  forcePublishElementEvents,
  viewMode,
  runtimePatches,
}: {
  el: DesignerElement;
  doc: DesignerState["doc"];
  onRegister: (id: ElementId, node: SVGElement | null) => void;
  renderCustom: (el: DesignerElement, doc: DesignerState["doc"]) => React.ReactNode;
  renderNativeByDefinition?: (el: DesignerElement, doc: DesignerState["doc"]) => React.ReactNode;
  api: DesignerAPI;
  forcePublishElementEvents: boolean;
  viewMode?: boolean;
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

  const shouldIgnoreGlobalForce = Boolean((elPatched as unknown as { ignoreGlobalForcePublishElementEvents?: boolean }).ignoreGlobalForcePublishElementEvents);
  const effectiveForcePublishElementEvents = forcePublishElementEvents && !shouldIgnoreGlobalForce;

  const resolveEventTopic = (el: DesignerElement): string => {
    const meta = el as unknown as { mqttTopic?: unknown; mqttTopicEnabled?: unknown };
    const hasTopic = typeof meta.mqttTopic === "string" && meta.mqttTopic.trim();
    const enabled = meta.mqttTopicEnabled === undefined ? Boolean(hasTopic) : meta.mqttTopicEnabled === true;
    const topic = typeof meta.mqttTopic === "string" ? meta.mqttTopic.trim() : "";
    return enabled && topic ? topic : "default/events";
  };

  const getOnClickAction = (el: DesignerElement): string | undefined => {
    if (el.type !== "custom") return undefined;
    const props = (el.props ?? {}) as Record<string, unknown>;
    const v = props.onClickAction;
    return typeof v === "string" && v.trim() ? v : undefined;
  };

  const shouldConfirmButtonClick = (el: DesignerElement): null | {
    text: string;
    okAlias: string;
    cancelAlias: string;
  } => {
    if (el.type !== "custom") return null;
    const kind = (el as unknown as { kind?: unknown }).kind;
    if (kind !== "button") return null;

    const props = (el.props ?? {}) as Record<string, unknown>;
    const use = Boolean(props.useConfirmationDialog ?? false);
    if (!use) return null;

    const text = typeof props.confirmationDialogText === "string" ? props.confirmationDialogText : "Are you sure?";
    const okAlias = typeof props.okAlias === "string" ? props.okAlias : "OK";
    const cancelAlias = typeof props.cancelAlias === "string" ? props.cancelAlias : "Cancel";
    return { text, okAlias, cancelAlias };
  };

  const publishElementEvent = (el: DesignerElement, eventType: "onMouseEnter" | "onClick" | "onMouseLeave") => {
    // IMPORTANT: UI event publishing is an Online/View Mode feature.
    // In Edit Mode, clicks should edit/select elements and must not publish or confirm.
    if (!viewMode) return;

    if (eventType === "onClick") {
      const confirmCfg = shouldConfirmButtonClick(el);
      if (confirmCfg) {
        // Note: browser confirm() does not allow custom button labels.
        const hint = (confirmCfg.okAlias || confirmCfg.cancelAlias)
          ? `\n\n[OK: ${confirmCfg.okAlias || "OK"}]  [Cancel: ${confirmCfg.cancelAlias || "Cancel"}]`
          : "";
        const message = `${confirmCfg.text || "Are you sure?"}${hint}`;

        if (typeof window !== "undefined") {
          const ok = window.confirm(message);
          if (!ok) return;
        }
      }
    }

    const topic = resolveEventTopic(el);
    if (eventType === "onClick") {
      const action = getOnClickAction(el);
      api.publishEvent(topic, action ? { eventType, sourceElement: el.id, action } : { eventType, sourceElement: el.id });
      return;
    }
    api.publishEvent(topic, { eventType, sourceElement: el.id });
  };

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
            viewMode={viewMode}
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
            viewMode && (effectiveForcePublishElementEvents || elPatched.enableOnMouseHoverEventListener)
              ? () => publishElementEvent(elPatched, "onMouseEnter")
              : undefined
          }
          onClick={
            viewMode && (effectiveForcePublishElementEvents || elPatched.enableOnMouseClickEventListener)
              ? () => publishElementEvent(elPatched, "onClick")
              : undefined
          }
          onMouseLeave={
            viewMode && (effectiveForcePublishElementEvents || elPatched.enableOnMouseLeaveEventListener)
              ? () => publishElementEvent(elPatched, "onMouseLeave")
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
          viewMode && (effectiveForcePublishElementEvents || elPatched.enableOnMouseHoverEventListener)
            ? () => publishElementEvent(elPatched, "onMouseEnter")
            : undefined
        }
        onClick={
          viewMode && (effectiveForcePublishElementEvents || elPatched.enableOnMouseClickEventListener)
            ? () => publishElementEvent(elPatched, "onClick")
            : undefined
        }
        onMouseLeave={
          viewMode && (effectiveForcePublishElementEvents || elPatched.enableOnMouseLeaveEventListener)
            ? () => publishElementEvent(elPatched, "onMouseLeave")
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
});
