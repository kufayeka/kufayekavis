import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const MAX_JSON_BYTES = 2 * 1024 * 1024; // 2MB

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
  if (Buffer.byteLength(trimmed, "utf8") > MAX_JSON_BYTES) return { ok: false, error: "jsonText too large" };

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
