import type { CanvasSettings, ClipboardPayload, DesignerDocument } from "./types";

export function exportDocument(doc: DesignerDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function importDocument(jsonText: string): DesignerDocument {
  const parsed = JSON.parse(jsonText) as DesignerDocument;
  if (!parsed || parsed.version !== 1) {
    throw new Error("Unsupported project file version");
  }
  if (!parsed.canvas || typeof parsed.canvas.width !== "number") {
    throw new Error("Invalid project file");
  }
  const canvas = parsed.canvas as unknown as Partial<CanvasSettings>;
  if (typeof canvas.snapToGrid !== "boolean") {
    (parsed.canvas as CanvasSettings).snapToGrid = false;
  }

  if (!parsed.pluginSettings || typeof parsed.pluginSettings !== "object") {
    (parsed as DesignerDocument).pluginSettings = {};
  }

  return parsed;
}

export function exportClipboard(payload: ClipboardPayload): string {
  return JSON.stringify(payload);
}

export function importClipboard(text: string): ClipboardPayload {
  const parsed = JSON.parse(text) as ClipboardPayload;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.elements)) {
    throw new Error("Invalid clipboard payload");
  }
  return parsed;
}
