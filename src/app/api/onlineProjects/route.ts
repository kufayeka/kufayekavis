import { NextResponse } from "next/server";
import { createOnlineProjectId, saveOnlineProjectJsonText, validateJsonText } from "../../../lib/onlineProjectsStore";

export const runtime = "nodejs";

async function readJsonText(req: Request): Promise<string> {
  const ct = req.headers.get("content-type") ?? "";

  // Allow raw json text
  if (ct.includes("text/plain")) {
    return await req.text();
  }

  // Default: JSON body
  const body = (await req.json().catch(() => null)) as unknown;

  if (typeof body === "string") return body;

  if (body && typeof body === "object" && !Array.isArray(body)) {
    const rec = body as Record<string, unknown>;
    if (typeof rec.jsonText === "string") return rec.jsonText;
    if (rec.doc && typeof rec.doc === "object") return JSON.stringify(rec.doc);
  }

  return "";
}

export async function POST(req: Request) {
  const jsonText = await readJsonText(req);
  const v = validateJsonText(jsonText);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
  }

  const id = createOnlineProjectId();
  await saveOnlineProjectJsonText(id, jsonText);

  return NextResponse.json({ ok: true, id, viewerUrl: `/online/${id}` });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Use GET /api/onlineProjects/{id} to fetch a project" },
    { status: 405 },
  );
}
