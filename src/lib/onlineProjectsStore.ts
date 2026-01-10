import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

// Keep this reasonably small: online publish is meant for a single project snapshot.
// Note: some hosting providers enforce their own request size limits.
const MAX_JSON_BYTES = 8 * 1024 * 1024; // 8MB

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "?";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function storeDir(): string {
  // Keep it out of /public and /src; this is runtime data.
  return path.join(process.cwd(), ".data", "online-projects");
}

function filePathForId(id: string): string {
  // defensive: only allow simple ids
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(storeDir(), `${safe}.json`);
}

export async function ensureOnlineProjectStore(): Promise<void> {
  await fs.mkdir(storeDir(), { recursive: true });
}

export function createOnlineProjectId(): string {
  // URL-safe id
  return crypto.randomUUID();
}

export function validateJsonText(jsonText: string): { ok: true } | { ok: false; error: string } {
  if (typeof jsonText !== "string") return { ok: false, error: "jsonText must be a string" };
  const trimmed = jsonText.trim();
  if (!trimmed) return { ok: false, error: "jsonText is empty" };
  const bytes = Buffer.byteLength(trimmed, "utf8");
  if (bytes > MAX_JSON_BYTES) {
    return { ok: false, error: `jsonText too large (${formatBytes(bytes)} > ${formatBytes(MAX_JSON_BYTES)})` };
  }

  try {
    JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "jsonText is not valid JSON" };
  }

  return { ok: true };
}

export async function saveOnlineProjectJsonText(id: string, jsonText: string): Promise<void> {
  await ensureOnlineProjectStore();
  const fp = filePathForId(id);
  await fs.writeFile(fp, jsonText, "utf8");
}

export async function loadOnlineProjectJsonText(id: string): Promise<string | null> {
  await ensureOnlineProjectStore();
  const fp = filePathForId(id);
  try {
    return await fs.readFile(fp, "utf8");
  } catch {
    return null;
  }
}
