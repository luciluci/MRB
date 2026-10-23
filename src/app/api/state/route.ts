import { readState } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await readState(), { headers: { "Cache-Control": "no-store" } });
}
