import type { DesignerDocument, DesignerDocumentSnapshot, DesignerHistory } from "./types";

export const DEFAULT_HISTORY_LIMIT = 10;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function stripHistory(doc: DesignerDocument | DesignerDocumentSnapshot): DesignerDocumentSnapshot {
  const anyDoc = doc as unknown as Record<string, unknown>;
  const rest = { ...anyDoc };
  delete (rest as { history?: unknown }).history;
  delete (rest as { pluginSettings?: unknown }).pluginSettings;
  return rest as unknown as DesignerDocumentSnapshot;
}

function getPluginSettingsMap(doc: DesignerDocument): Record<string, unknown> | undefined {
  const value = (doc as unknown as { pluginSettings?: unknown }).pluginSettings;
  if (!isObject(value)) return undefined;
  return value;
}

export function getHistory(doc: DesignerDocument): DesignerHistory {
  const limitRaw = doc.history?.limit;
  const limit = Number.isFinite(limitRaw) && (limitRaw as number) > 0 ? (limitRaw as number) : DEFAULT_HISTORY_LIMIT;

  const past = Array.isArray(doc.history?.past) ? doc.history!.past : [];
  const future = Array.isArray(doc.history?.future) ? doc.history!.future : [];

  // Sanitize snapshots: remove nested history and keep only valid-ish shapes.
  const sanitizeSnap = (snap: unknown): DesignerDocumentSnapshot | null => {
    if (!isObject(snap)) return null;
    if (snap.version !== 1) return null;
    if (!isObject(snap.canvas)) return null;
    if (!isObject(snap.elements)) return null;
    if (!Array.isArray(snap.rootIds)) return null;
    if (typeof snap.nextZ !== "number") return null;
    return stripHistory(snap as unknown as DesignerDocumentSnapshot);
  };

  const pastSan = past.map(sanitizeSnap).filter(Boolean) as DesignerDocumentSnapshot[];
  const futureSan = future.map(sanitizeSnap).filter(Boolean) as DesignerDocumentSnapshot[];

  return {
    limit,
    past: pastSan.slice(-limit),
    future: futureSan.slice(0, limit),
  };
}

export function ensureHistory(doc: DesignerDocument): DesignerDocument {
  const history = getHistory(doc);
  return { ...doc, history };
}

export function commitDocChange(prevDoc: DesignerDocument, nextDoc: DesignerDocument): DesignerDocument {
  const prevHistory = getHistory(prevDoc);
  const limit = prevHistory.limit;

  const prevSnap = stripHistory(prevDoc);
  const nextSnap = stripHistory(nextDoc);

  const past = [...prevHistory.past, prevSnap].slice(-limit);

  const pluginSettings = getPluginSettingsMap(nextDoc) ?? getPluginSettingsMap(prevDoc);

  return {
    ...nextSnap,
    ...(pluginSettings !== undefined ? { pluginSettings } : {}),
    history: {
      limit,
      past,
      future: [],
    },
  };
}

export function canUndo(doc: DesignerDocument): boolean {
  return getHistory(doc).past.length > 0;
}

export function canRedo(doc: DesignerDocument): boolean {
  return getHistory(doc).future.length > 0;
}

export function undoDoc(doc: DesignerDocument): { doc: DesignerDocument; didUndo: boolean } {
  const history = getHistory(doc);
  if (history.past.length === 0) return { doc: ensureHistory(doc), didUndo: false };

  const prev = history.past[history.past.length - 1];
  const currentSnap = stripHistory(doc);

  const nextPast = history.past.slice(0, -1);
  const nextFuture = [currentSnap, ...history.future].slice(0, history.limit);

  const pluginSettings = getPluginSettingsMap(doc);

  return {
    doc: {
      ...prev,
      ...(pluginSettings !== undefined ? { pluginSettings } : {}),
      history: {
        limit: history.limit,
        past: nextPast,
        future: nextFuture,
      },
    },
    didUndo: true,
  };
}

export function redoDoc(doc: DesignerDocument): { doc: DesignerDocument; didRedo: boolean } {
  const history = getHistory(doc);
  if (history.future.length === 0) return { doc: ensureHistory(doc), didRedo: false };

  const next = history.future[0];
  const currentSnap = stripHistory(doc);

  const nextPast = [...history.past, currentSnap].slice(-history.limit);
  const nextFuture = history.future.slice(1);

  const pluginSettings = getPluginSettingsMap(doc);

  return {
    doc: {
      ...next,
      ...(pluginSettings !== undefined ? { pluginSettings } : {}),
      history: {
        limit: history.limit,
        past: nextPast,
        future: nextFuture,
      },
    },
    didRedo: true,
  };
}
