import { NextResponse } from "next/server";
import { modelsForProvider } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider")?.toLowerCase() || "";

  const models = modelsForProvider(provider);
  if (provider === "disabled" || models.length === 0) {
    return NextResponse.json(
      { success: false, error: "Provider not found or disabled", models: [] },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, models });
}
