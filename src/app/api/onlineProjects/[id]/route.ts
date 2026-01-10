import { NextResponse } from "next/server";
import { loadOnlineProjectJsonText } from "../../../../lib/onlineProjectsStore";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const jsonText = await loadOnlineProjectJsonText(id);
  if (!jsonText) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  // Return as JSON so clients can parse if needed.
  // Viewer uses it as text, so we include jsonText explicitly.
  return NextResponse.json({ ok: true, id, jsonText });
}
