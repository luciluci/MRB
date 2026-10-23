import { updateState } from "@/lib/store";
import type { DemoAction } from "@/lib/actions";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const action = await request.json() as DemoAction;
    if (!action || typeof action.type !== "string") throw new Error("Invalid action");
    return Response.json(await updateState(action));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
