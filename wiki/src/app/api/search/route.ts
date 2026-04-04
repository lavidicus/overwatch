import { NextResponse } from "next/server";
import { searchDocs } from "@/lib/content";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const results = await searchDocs(query);
  return NextResponse.json({ results });
}
