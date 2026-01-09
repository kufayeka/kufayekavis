import type { CanvasSettings, ClipboardPayload, DesignerDocument } from "./types";
import { normalizeDocument } from "./normalize";

export function exportDocument(doc: DesignerDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function importDocument(jsonText: string): DesignerDocument {
  const parsed = JSON.parse(jsonText) as unknown;
  // Normalization validates required fields and coerces element shapes.
  // Unknown fields are preserved for forward compatibility.
  const doc = normalizeDocument(parsed);
  // Backward-compat: older exports might omit snapToGrid.
  if (typeof (doc.canvas as unknown as Partial<CanvasSettings>).snapToGrid !== "boolean") {
    (doc.canvas as CanvasSettings).snapToGrid = false;
  }
  return doc;
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
