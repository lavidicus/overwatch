import fs from "fs";
import { NextResponse } from "next/server";
import { getDocBySlug } from "@/lib/content";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const doc = await getDocBySlug(slug);
  if (!doc) {
    return new NextResponse("Not found", { status: 404 });
  }
  const fileBuffer = fs.readFileSync(doc.filePath);
  const contentType = doc.type === "pdf" ? "application/pdf" : "text/plain";
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
    },
  });
}
