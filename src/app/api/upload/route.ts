import { NextResponse } from "next/server";
import { saveUpload } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "이미지 파일이 없습니다." }, { status: 400 });
    }
    const path = await saveUpload(file);
    return NextResponse.json({ path });
  } catch (err) {
    const message = err instanceof Error ? err.message : "업로드에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
