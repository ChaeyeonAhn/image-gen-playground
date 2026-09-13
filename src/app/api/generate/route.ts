import { NextResponse } from "next/server";
import { getModels, getProvider } from "@/lib/providers";
import { insertGeneration } from "@/lib/repo";
import { persistGeneratedImages, refImageToDataUrl } from "@/lib/storage";
import type { GenerateRequest, Mode } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  let body: GenerateRequest;
  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return bad("요청 본문을 읽을 수 없습니다.");
  }

  const prompt = body.prompt?.trim();
  if (!prompt) return bad("프롬프트를 입력해주세요.");
  if (prompt.length > 4000) return bad("프롬프트가 너무 깁니다 (최대 4000자).");

  const model = getModels().find((m) => m.id === body.model);
  if (!model) return bad("알 수 없는 모델입니다.");

  const size = model.sizes.includes(body.size) ? body.size : model.sizes[0];

  const refImage = body.refImage?.trim() || null;
  if (refImage && !model.supportsImageInput) {
    return bad(`${model.label} 은 참조 이미지를 받지 않습니다.`);
  }
  const mode: Mode = refImage ? "i2i" : "t2i";

  const seed =
    model.supportsSeed &&
    typeof body.seed === "number" &&
    Number.isInteger(body.seed) &&
    body.seed >= 0
      ? body.seed
      : null;
  const watermark = model.supportsWatermark && body.watermark === true;

  const record = (status: "ok" | "error", error: string | null, latencyMs: number, images: Array<{ filePath: string; sourceUrl: string | null }>) =>
    insertGeneration({
      mode,
      provider: model.provider,
      model: model.id,
      prompt,
      size,
      seed,
      watermark,
      refImage,
      status,
      error,
      latencyMs,
      images,
    });

  const startedAt = Date.now();
  try {
    const image = refImage ? await refImageToDataUrl(refImage) : null;
    const result = await getProvider(model.provider).generate({
      modelId: model.modelId,
      prompt,
      size,
      seed,
      watermark,
      image,
    });
    const saved = await persistGeneratedImages(result);

    return NextResponse.json({ generation: record("ok", null, Date.now() - startedAt, saved) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";

    // 실패도 히스토리에 남긴다 — 어떤 프롬프트가 막히는지가 플레이그라운드에서 중요한 정보다.
    return NextResponse.json(
      { generation: record("error", message, Date.now() - startedAt, []), error: message },
      { status: 502 },
    );
  }
}
