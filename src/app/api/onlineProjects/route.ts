import { NextResponse } from "next/server";
import { createOnlineProjectId, saveOnlineProjectJsonText, validateJsonText } from "../../../lib/onlineProjectsStore";

function isShortId(id: string): boolean {
  return /^[a-z0-9]{5}$/.test(id);
}

async function readPublishPayload(req: Request): Promise<{ jsonText: string; projectId?: string; canvasId?: string }> {
  const ct = req.headers.get("content-type") ?? "";

  // Back-compat: allow raw json text
  if (ct.includes("text/plain")) {
    return { jsonText: await req.text() };
  }

  const body = (await req.json().catch(() => null)) as unknown;
  if (typeof body === "string") return { jsonText: body };

  if (body && typeof body === "object" && !Array.isArray(body)) {
    const rec = body as Record<string, unknown>;
    const jsonText = typeof rec.jsonText === "string" ? rec.jsonText : typeof rec.doc === "object" ? JSON.stringify(rec.doc) : "";
    const projectId = typeof rec.projectId === "string" ? rec.projectId : undefined;
    const canvasId = typeof rec.canvasId === "string" ? rec.canvasId : undefined;
    return { jsonText, projectId, canvasId };
  }

  return { jsonText: "" };
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  const payload = await readPublishPayload(req);
  const jsonText = payload.jsonText;
  const v = validateJsonText(jsonText);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
  }

  let projectId = payload.projectId && isShortId(payload.projectId) ? payload.projectId : "";
  let canvasId = payload.canvasId && isShortId(payload.canvasId) ? payload.canvasId : "";

  if (!projectId) {
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const rec = parsed as Record<string, unknown>;
        if (typeof rec.id === "string" && isShortId(rec.id)) projectId = rec.id;
        if (!canvasId && typeof rec.activeCanvasId === "string" && isShortId(rec.activeCanvasId)) canvasId = rec.activeCanvasId;
      }
    } catch {
      // ignore
    }
  }

  if (!projectId) projectId = await createOnlineProjectId();

  await saveOnlineProjectJsonText(projectId, jsonText);
  const viewerUrl = canvasId ? `/online/${projectId}/${canvasId}` : `/online/${projectId}`;

  return NextResponse.json({ ok: true, id: projectId, viewerUrl });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Use GET /api/onlineProjects/{id} to fetch a project" },
    { status: 405 },
  );
}
