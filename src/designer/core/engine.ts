import { createId } from "./ids";
import { produce } from "immer";
import {
  createCircle,
  createCustom,
  createEmptyDocument,
  createFree,
  createGroup,
  createImage,
  createText,
  createLine,
  createRect,
} from "./defaults";
import { clamp } from "./math";
import { Emitter } from "./emitter";
import { exportDocument, importDocument } from "./serialize";
import { translateElement } from "./transform";
import { getSelectionBBox } from "./geometry";
import { canRedo, canUndo, commitDocChange, ensureHistory, redoDoc, undoDoc } from "./history";
import { normalizeElement } from "./normalize";
import type {
  CanvasSettings,
  ClipboardPayload,
  DesignerDocument,
  DesignerElement,
  ElementId,
  SelectionState,
  ToolType,
  ZoomState,
} from "./types";

export type DesignerState = {
  doc: DesignerDocument;
  selection: SelectionState;
  zoom: ZoomState;
  tool: ToolType;
  clipboard: ClipboardPayload | null;
  viewMode?: boolean;
};

type EngineEvent = "change";

export type CreateElementInput =
  | { type: "rect"; x: number; y: number }
  | { type: "circle"; x: number; y: number }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number }
  | { type: "free"; d: string }
  | { type: "text"; x: number; y: number; text?: string }
  | { type: "custom"; kind: string; x: number; y: number; width?: number; height?: number; props?: Record<string, unknown> }
  | {
      type: "image";
      x: number;
      y: number;
      href: string;
      width?: number;
      height?: number;
      preserveAspectRatio?: string;
      fit?: "none" | "contain" | "cover";
      naturalWidth?: number;
      naturalHeight?: number;
    };


export class DesignerEngine {
  private emitter = new Emitter<EngineEvent>();
  private state: DesignerState;

  private historyBatchDepth = 0;
  private pendingHistoryBaseDoc: DesignerDocument | null = null;
  private pendingHistoryBaseSnapJson: string | null = null;
  private pendingHistoryTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingHistoryDelayMs = 180;

  constructor(initial?: Partial<DesignerState>) {
    this.state = {
      doc: ensureHistory(initial?.doc ?? createEmptyDocument()),
      selection: initial?.selection ?? { ids: [] },
      zoom: initial?.zoom ?? { scale: 1, panX: 0, panY: 0 },
      tool: initial?.tool ?? "select",
      clipboard: initial?.clipboard ?? null,
      viewMode: initial?.viewMode ?? false,
    };
  }

  subscribe(listener: () => void): () => void {
    return this.emitter.on("change", listener);
  }

  getState(): DesignerState {
    return this.state;
  }

  private setState(next: DesignerState): void {
    this.state = next;
    this.emitter.emit("change");
  }

  private clearPendingHistory() {
    if (this.pendingHistoryTimer) {
      clearTimeout(this.pendingHistoryTimer);
      this.pendingHistoryTimer = null;
    }
    this.pendingHistoryBaseDoc = null;
    this.pendingHistoryBaseSnapJson = null;
  }

  private flushPendingHistory(): void {
    if (!this.pendingHistoryBaseDoc) return;

    const base = this.pendingHistoryBaseDoc;
    const baseSnapJson = this.pendingHistoryBaseSnapJson;
    const current = ensureHistory(this.state.doc);
    const currentSnapJson = JSON.stringify(current, (key, value) => (key === "history" || key === "pluginSettings" ? undefined : value));

    // If nothing changed, keep current doc but drop pending markers.
    if (baseSnapJson && currentSnapJson === baseSnapJson) {
      this.clearPendingHistory();
      return;
    }

    const committed = commitDocChange(base, current);
    this.clearPendingHistory();
    this.setState({ ...this.state, doc: committed });
  }

  private schedulePendingHistoryFlush(): void {
    if (this.historyBatchDepth > 0) return;
    if (this.pendingHistoryTimer) clearTimeout(this.pendingHistoryTimer);
    this.pendingHistoryTimer = setTimeout(() => {
      this.flushPendingHistory();
    }, this.pendingHistoryDelayMs);
  }

  private commitDocImmediate(
    nextDoc: DesignerDocument,
    patch?: Partial<Pick<DesignerState, "selection" | "zoom" | "tool" | "clipboard" | "viewMode">>,
  ) {
    // Ensure we don't accidentally merge a prior buffered change into this immediate one.
    this.flushPendingHistory();
    const committed = commitDocChange(this.state.doc, ensureHistory(nextDoc));
    this.setState({ ...this.state, ...patch, doc: committed });
  }

  private commitDocBuffered(
    nextDoc: DesignerDocument,
    patch?: Partial<Pick<DesignerState, "selection" | "zoom" | "tool" | "clipboard" | "viewMode">>,
  ) {
    // First change in a burst captures the "A" snapshot.
    if (!this.pendingHistoryBaseDoc) {
      const base = this.state.doc;
      this.pendingHistoryBaseDoc = base;
      this.pendingHistoryBaseSnapJson = JSON.stringify(base, (key, value) => (key === "history" || key === "pluginSettings" ? undefined : value));
    }

    const baseHistory = ensureHistory(this.pendingHistoryBaseDoc).history!;
    const nextWithHistory = { ...ensureHistory(nextDoc), history: baseHistory };
    this.setState({ ...this.state, ...patch, doc: nextWithHistory });
    this.schedulePendingHistoryFlush();
  }

  private commitDoc(
    nextDoc: DesignerDocument,
    patch?: Partial<Pick<DesignerState, "selection" | "zoom" | "tool" | "clipboard" | "viewMode">>,
    opts?: { mode?: "immediate" | "buffered" },
  ) {
    if (opts?.mode === "buffered") {
      this.commitDocBuffered(nextDoc, patch);
      return;
    }
    this.commitDocImmediate(nextDoc, patch);
  }

  beginHistoryBatch(): void {
    // Close any implicit burst before starting an explicit one.
    this.flushPendingHistory();
    this.historyBatchDepth += 1;
  }

  endHistoryBatch(): void {
    if (this.historyBatchDepth <= 0) return;
    this.historyBatchDepth -= 1;
    if (this.historyBatchDepth === 0) this.flushPendingHistory();
  }

  flushHistory(): void {
    this.flushPendingHistory();
  }

  setTool(tool: ToolType) {
    this.setState({ ...this.state, tool });
  }

  setViewMode(v: boolean) {
    this.setState({ ...this.state, viewMode: v });
  }

  getPluginSettings(pluginId: string): unknown {
    const map = (this.state.doc as unknown as { pluginSettings?: Record<string, unknown> }).pluginSettings ?? {};
    return map[pluginId];
  }

  setPluginSettings(pluginId: string, value: unknown): void {
    const cur = (this.state.doc as unknown as { pluginSettings?: Record<string, unknown> }).pluginSettings ?? {};
    const nextSettings = { ...cur, [pluginId]: value };
    // Plugin settings should not affect undo/redo history; update doc directly.
    this.setState({
      ...this.state,
      doc: {
        ...this.state.doc,
        pluginSettings: nextSettings,
      },
    });
  }

  setCanvas(patch: Partial<CanvasSettings>) {
    const nextDoc: DesignerDocument = {
      ...this.state.doc,
      canvas: { ...this.state.doc.canvas, ...patch },
    };
    this.commitDoc(nextDoc, undefined, { mode: "buffered" });
  }

  setZoom(patch: Partial<ZoomState>) {
    const scale = patch.scale ?? this.state.zoom.scale;
    this.setState({
      ...this.state,
      zoom: {
        ...this.state.zoom,
        ...patch,
        scale: clamp(scale, 0.1, 8),
      },
    });
  }

  select(ids: ElementId[], opts?: { append?: boolean }) {
    const append = opts?.append ?? false;
    const nextIds = append
      ? Array.from(new Set([...this.state.selection.ids, ...ids]))
      : Array.from(new Set(ids));
    this.setState({ ...this.state, selection: { ids: nextIds } });
  }

  clearSelection() {
    this.select([]);
  }

  createElement(input: CreateElementInput): ElementId {
    const id = createId(input.type);
    const zIndex = this.state.doc.nextZ;
    const doc = this.state.doc;

    const snapCoord = (v: number) => {
      if (!doc.canvas.snapToGrid) return v;
      const g = Math.max(1, doc.canvas.gridSize || 1);
      return Math.round(v / g) * g;
    };

    const snapPoint = (x: number, y: number) => ({ x: snapCoord(x), y: snapCoord(y) });

    let element: DesignerElement;
    if (input.type === "rect") {
      const p = snapPoint(input.x, input.y);
      element = createRect({ id, zIndex, x: p.x, y: p.y });
    } else if (input.type === "circle") {
      const p = snapPoint(input.x, input.y);
      element = createCircle({ id, zIndex, cx: p.x, cy: p.y });
    } else if (input.type === "line") {
      const p1 = snapPoint(input.x1, input.y1);
      const p2 = snapPoint(input.x2, input.y2);
      element = createLine({ id, zIndex, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    } else if (input.type === "free") {
      element = createFree({ id, zIndex, d: input.d });
    } else if (input.type === "text") {
      const p = snapPoint(input.x, input.y);
      const txtIn = input as Extract<CreateElementInput, { type: "text" }>;
      element = createText({ id, zIndex, x: p.x, y: p.y, text: txtIn.text });
    } else if (input.type === "custom") {
      const p = snapPoint(input.x, input.y);
      const cIn = input as Extract<CreateElementInput, { type: "custom" }>;
      element = createCustom({
        id,
        zIndex,
        kind: cIn.kind,
        x: p.x,
        y: p.y,
        width: cIn.width,
        height: cIn.height,
        props: cIn.props,
      });
    } else {
      const p = snapPoint(input.x, input.y);
      const imgIn = input as Extract<CreateElementInput, { type: "image" }>;
      element = createImage({
        id,
        zIndex,
        x: p.x,
        y: p.y,
        href: imgIn.href,
        width: imgIn.width,
        height: imgIn.height,
        preserveAspectRatio: imgIn.preserveAspectRatio,
        fit: imgIn.fit,
        naturalWidth: imgIn.naturalWidth,
        naturalHeight: imgIn.naturalHeight,
      });
    }

    const nextDoc: DesignerDocument = {
      ...doc,
      nextZ: doc.nextZ + 1,
      elements: { ...doc.elements, [id]: element },
      rootIds: [...doc.rootIds, id],
    };

    this.commitDoc(nextDoc, { selection: { ids: [id] } });
    return id;
  }

  updateElement(id: ElementId, patch: Partial<DesignerElement>) {
    const current = this.state.doc.elements[id];
    if (!current) return;
    const merged = { ...current, ...patch } as unknown;
    const normalized = normalizeElement(merged);
    const next = (normalized ?? (merged as DesignerElement)) as DesignerElement;
    const nextDoc: DesignerDocument = produce(this.state.doc, (draft) => {
      draft.elements[id] = next;
    });
    this.commitDoc(nextDoc, undefined, { mode: "buffered" });
  }

  updateElements(ids: ElementId[], updater: (el: DesignerElement) => DesignerElement) {
    const nextDoc: DesignerDocument = produce(this.state.doc, (draft) => {
      for (const id of ids) {
        const el = draft.elements[id];
        if (!el) continue;
        const updated = updater(el) as unknown;
        const normalized = normalizeElement(updated);
        draft.elements[id] = (normalized ?? (updated as DesignerElement)) as DesignerElement;
      }
    });
    this.commitDoc(nextDoc, undefined, { mode: "buffered" });
  }

  translate(ids: ElementId[], dx: number, dy: number) {
    if (ids.length === 0) return;
    const nextDoc: DesignerDocument = produce(this.state.doc, (draft) => {
      const translateRec = (id: ElementId) => {
        const el = draft.elements[id];
        if (!el) return;
        if (el.type === "group") {
          for (const childId of el.childIds) translateRec(childId);
          return;
        }
        draft.elements[id] = translateElement(el, dx, dy);
      };

      for (const id of ids) translateRec(id);
    });
    this.commitDoc(nextDoc, undefined, { mode: "buffered" });
  }

  deleteElements(ids: ElementId[]) {
    if (ids.length === 0) return;

    const toDelete = new Set<ElementId>();
    const visit = (id: ElementId) => {
      if (toDelete.has(id)) return;
      const el = this.state.doc.elements[id];
      if (!el) return;
      toDelete.add(id);
      if (el.type === "group") {
        for (const childId of el.childIds) visit(childId);
      }
    };
    for (const id of ids) visit(id);

    const nextSelection = this.state.selection.ids.filter((id) => !toDelete.has(id));

    const nextDoc: DesignerDocument = produce(this.state.doc, (draft) => {
      for (const id of toDelete) delete draft.elements[id];
      draft.rootIds = draft.rootIds.filter((id) => !toDelete.has(id));

      for (const el of Object.values(draft.elements)) {
        if (el.type !== "group") continue;
        el.childIds = el.childIds.filter((cid) => !toDelete.has(cid));
      }
    });
    this.commitDoc(nextDoc, { selection: { ids: nextSelection } });
  }

  bringToFront(ids: ElementId[]) {
    if (ids.length === 0) return;
    const nextDoc: DesignerDocument = produce(this.state.doc, (draft) => {
      let nextZ = draft.nextZ;
      for (const id of ids) {
        const el = draft.elements[id];
        if (!el) continue;
        el.zIndex = nextZ++;
      }
      draft.nextZ = nextZ;
    });
    this.commitDoc(nextDoc);
  }

  groupSelection(): ElementId | null {
    const ids = this.state.selection.ids;
    if (ids.length < 2) return null;

    const existing = ids.filter((id) => Boolean(this.state.doc.elements[id]));
    if (existing.length < 2) return null;

    const parentIds = new Set<string | null>();
    for (const id of existing) {
      const el = this.state.doc.elements[id];
      parentIds.add(el?.parentId ?? null);
    }
    const commonParentId = parentIds.size === 1 ? Array.from(parentIds)[0] : null;

    const groupId = createId("group");
    const zIndex = this.state.doc.nextZ;
    const group = createGroup({ id: groupId, zIndex, childIds: [...existing], parentId: commonParentId ?? undefined });

    const nextDoc: DesignerDocument = produce(this.state.doc, (draft) => {
      draft.nextZ += 1;
      draft.elements[groupId] = group;

      // Detach selected elements from their previous parents (root or group)
      for (const id of existing) {
        const el = draft.elements[id];
        if (!el) continue;

        const prevParentId = el.parentId;
        if (prevParentId) {
          const parent = draft.elements[prevParentId];
          if (parent && parent.type === "group") {
            parent.childIds = parent.childIds.filter((cid) => cid !== id);
          }
        } else {
          const idx = draft.rootIds.indexOf(id);
          if (idx >= 0) draft.rootIds.splice(idx, 1);
        }

        el.parentId = groupId;
      }

      if (commonParentId) {
        const parent = draft.elements[commonParentId];
        if (parent && parent.type === "group") {
          parent.childIds.push(groupId);
        } else {
          // Parent id existed but isn't a group anymore; fall back to root
          draft.rootIds.push(groupId);
          (draft.elements[groupId] as DesignerElement).parentId = undefined;
        }
      } else {
        draft.rootIds.push(groupId);
      }
    });
    this.commitDoc(nextDoc, { selection: { ids: [groupId] } });

    return groupId;
  }

  ungroupSelection(): ElementId[] {
    const selected = this.state.selection.ids;
    if (selected.length === 0) return [];

    const nextSelection: ElementId[] = [];

    const nextDoc: DesignerDocument = produce(this.state.doc, (draft) => {
      for (const id of selected) {
        const el = draft.elements[id];
        if (!el || el.type !== "group") continue;

        const group = el;
        const parentId = group.parentId;

        // Remove group from its container
        if (parentId) {
          const parent = draft.elements[parentId];
          if (parent && parent.type === "group") {
            const groupIndex = parent.childIds.indexOf(group.id);
            const withoutGroup = parent.childIds.filter((cid) => cid !== group.id);
            const insertAt = groupIndex >= 0 ? groupIndex : withoutGroup.length;
            const nextChildIds = [...withoutGroup];
            nextChildIds.splice(insertAt, 0, ...group.childIds);
            parent.childIds = nextChildIds;
          }
        } else {
          const groupIndex = draft.rootIds.indexOf(group.id);
          if (groupIndex >= 0) {
            draft.rootIds.splice(groupIndex, 1, ...group.childIds);
          } else {
            draft.rootIds.push(...group.childIds);
          }
        }

        // Re-parent children
        for (const childId of group.childIds) {
          const child = draft.elements[childId];
          if (!child) continue;
          child.parentId = parentId;
          nextSelection.push(childId);
        }

        delete draft.elements[group.id];
      }
    });

    this.commitDoc(nextDoc, { selection: { ids: nextSelection } });

    return nextSelection;
  }

  copySelection() {
    const ids = this.state.selection.ids;

    const doc = this.state.doc;
    const selected = new Set(ids);

    const isDescendantOfSelected = (id: ElementId): boolean => {
      let cur = doc.elements[id];
      while (cur?.parentId) {
        if (selected.has(cur.parentId)) return true;
        cur = doc.elements[cur.parentId];
      }
      return false;
    };

    const roots = ids.filter((id) => !isDescendantOfSelected(id));
    if (roots.length === 0) return;

    const allIds = new Set<ElementId>();
    const collect = (id: ElementId) => {
      if (allIds.has(id)) return;
      const el = doc.elements[id];
      if (!el) return;
      allIds.add(id);
      if (el.type === "group") {
        for (const childId of el.childIds) collect(childId);
      }
    };
    for (const id of roots) collect(id);

    const elements: DesignerElement[] = Array.from(allIds)
      .map((id) => doc.elements[id])
      .filter(Boolean)
      .map((el) => {
        const parentId = el!.parentId && allIds.has(el!.parentId) ? el!.parentId : undefined;
        if (el!.type === "group") {
          return {
            ...el!,
            parentId,
            childIds: el!.childIds.filter((cid) => allIds.has(cid)),
          } as DesignerElement;
        }
        return { ...el!, parentId } as DesignerElement;
      });

    if (elements.length === 0) return;
    this.setState({ ...this.state, clipboard: { version: 1, elements } });
  }

  pasteClipboard(offset: { dx: number; dy: number } = { dx: 16, dy: 16 }): ElementId[] {
    const payload = this.state.clipboard;
    if (!payload || payload.elements.length === 0) return [];

    const createdRootIds: ElementId[] = [];
    const nextElements = { ...this.state.doc.elements };
    const nextRootIds = [...this.state.doc.rootIds];
    let nextZ = this.state.doc.nextZ;

    const ordered = [...payload.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    const idMap = new Map<ElementId, ElementId>();
    for (const el of ordered) {
      idMap.set(el.id, createId(el.type));
    }

    const remapElement = (
      el: DesignerElement,
      patch: { id: ElementId; zIndex: number; parentId?: ElementId; childIds?: ElementId[] },
    ): DesignerElement => {
      const common = { id: patch.id, zIndex: patch.zIndex, parentId: patch.parentId };
      switch (el.type) {
        case "rect": {
          const r = el as Extract<DesignerElement, { type: "rect" }>;
          return { ...r, ...common };
        }
        case "circle": {
          const c = el as Extract<DesignerElement, { type: "circle" }>;
          return { ...c, ...common };
        }
        case "line": {
          const l = el as Extract<DesignerElement, { type: "line" }>;
          return { ...l, ...common };
        }
        case "free": {
          const f = el as Extract<DesignerElement, { type: "free" }>;
          return { ...f, ...common };
        }
        case "image": {
          const i = el as Extract<DesignerElement, { type: "image" }>;
          return { ...i, ...common };
        }
        case "text": {
          const t = el as Extract<DesignerElement, { type: "text" }>;
          return { ...t, ...common };
        }
        case "group": {
          const g = el as Extract<DesignerElement, { type: "group" }>;
          return { ...g, ...common, childIds: patch.childIds ?? [] };
        }
      }

      return { ...el, ...common };
    };

    // Create all elements with remapped ids + hierarchy
    for (const el of ordered) {
      const newId = idMap.get(el.id)!;
      const parentId = el.parentId ? idMap.get(el.parentId) : undefined;

      const childIds =
        el.type === "group"
          ? (el.childIds.map((cid) => idMap.get(cid)).filter(Boolean) as ElementId[])
          : undefined;

      let next = remapElement(el, { id: newId, zIndex: nextZ++, parentId, childIds });

      // Offset geometry for non-group elements
      if (next.type !== "group") {
        next = translateElement(next, offset.dx, offset.dy);
      }

      nextElements[newId] = next;
    }

    // Add roots
    for (const el of ordered) {
      if (el.parentId) continue;
      const newId = idMap.get(el.id);
      if (!newId) continue;
      createdRootIds.push(newId);
      nextRootIds.push(newId);
    }

    // Snap pasted content to grid as a whole (align bbox top-left)
    if (this.state.doc.canvas.snapToGrid && createdRootIds.length > 0) {
      const g = Math.max(1, this.state.doc.canvas.gridSize || 1);
      const draftDoc: DesignerDocument = {
        ...this.state.doc,
        elements: nextElements,
        rootIds: nextRootIds,
        nextZ,
      };
      const box = getSelectionBBox(createdRootIds, draftDoc);
      if (box) {
        const snapX = Math.round(box.x / g) * g;
        const snapY = Math.round(box.y / g) * g;
        const dx = snapX - box.x;
        const dy = snapY - box.y;
        if (dx !== 0 || dy !== 0) {
          for (const newId of idMap.values()) {
            const el = nextElements[newId];
            if (!el) continue;
            if (el.type === "group") continue;
            nextElements[newId] = translateElement(el, dx, dy);
          }
        }
      }
    }

    const nextDoc: DesignerDocument = { ...this.state.doc, elements: nextElements, rootIds: nextRootIds, nextZ };
    this.commitDoc(nextDoc, { selection: { ids: createdRootIds } });

    return createdRootIds;
  }

  duplicateSelection(): ElementId[] {
    this.copySelection();
    return this.pasteClipboard({ dx: 24, dy: 24 });
  }

  exportProjectJson(): string {
    this.flushHistory();
    return exportDocument(this.state.doc);
  }

  importProjectJson(jsonText: string) {
    this.clearPendingHistory();
    this.historyBatchDepth = 0;
    const doc = ensureHistory(importDocument(jsonText));
    this.setState({
      ...this.state,
      doc,
      selection: { ids: [] },
      zoom: { scale: 1, panX: 0, panY: 0 },
      tool: "select",
    });
  }

  canUndo(): boolean {
    return canUndo(this.state.doc);
  }

  canRedo(): boolean {
    return canRedo(this.state.doc);
  }

  undo(): boolean {
    this.flushHistory();
    const res = undoDoc(this.state.doc);
    if (!res.didUndo) return false;
    this.setState({ ...this.state, doc: res.doc, selection: { ids: [] } });
    return true;
  }

  redo(): boolean {
    this.flushHistory();
    const res = redoDoc(this.state.doc);
    if (!res.didRedo) return false;
    this.setState({ ...this.state, doc: res.doc, selection: { ids: [] } });
    return true;
  }
}
