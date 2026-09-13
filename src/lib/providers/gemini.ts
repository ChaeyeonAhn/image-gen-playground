import { postJson, splitDataUrl, type GenerateParams, type Provider, type ProviderImage } from "./types";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/** Interactions API 는 현재 jpeg 만 받는다. png 를 보내면 invalid_request 로 거절한다. */
const OUTPUT_MIME = "image/jpeg";

/**
 * 응답에서 base64 이미지를 찾아낸다.
 *
 * Gemini 는 Interactions API(output_image)와 레거시 generateContent(inline_data)의
 * 응답 모양이 다르고 앞으로도 바뀔 수 있어서, 특정 경로를 짚는 대신
 * "mime_type + data 를 함께 가진 객체" 를 통째로 훑어 모은다.
 */
function collectImages(node: unknown, found: ProviderImage[] = []): ProviderImage[] {
  if (Array.isArray(node)) {
    for (const child of node) collectImages(child, found);
    return found;
  }
  if (!node || typeof node !== "object") return found;

  const record = node as Record<string, unknown>;
  const data = record.data;
  const mime = record.mime_type ?? record.mimeType;

  if (typeof data === "string" && typeof mime === "string" && mime.startsWith("image/")) {
    found.push({ b64: data, mimeType: mime });
    return found;
  }

  for (const value of Object.values(record)) collectImages(value, found);
  return found;
}

/** 모델이 텍스트로 거절 사유를 돌려준 경우를 찾아 그대로 보여준다. */
function findText(node: unknown): string | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const text = findText(child);
      if (text) return text;
    }
    return null;
  }
  if (!node || typeof node !== "object") return null;

  const record = node as Record<string, unknown>;
  if (typeof record.text === "string" && record.text.trim()) return record.text.trim();

  for (const value of Object.values(record)) {
    const text = findText(value);
    if (text) return text;
  }
  return null;
}

/** Google Gemini 이미지 모델 (Nano Banana). */
export const geminiProvider: Provider = {
  id: "gemini",
  label: "Gemini",
  envKey: "GEMINI_API_KEY",

  isConfigured() {
    return Boolean(process.env.GEMINI_API_KEY?.trim());
  },

  async generate(params: GenerateParams): Promise<ProviderImage[]> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY 가 설정되지 않았습니다. .env.local 을 확인하세요.");
    }

    const input: Array<Record<string, unknown>> = [{ type: "text", text: params.prompt }];
    if (params.image) {
      const { mimeType, data } = splitDataUrl(params.image);
      input.push({ type: "image", mime_type: mimeType, data });
    }

    const payload = await postJson(
      `${BASE_URL}/interactions`,
      { "x-goog-api-key": apiKey },
      {
        model: params.modelId,
        input,
        response_format: {
          type: "image",
          mime_type: OUTPUT_MIME,
          image_size: params.size,
        },
      },
      "Gemini",
    );

    const images = collectImages(payload);
    if (images.length === 0) {
      const text = findText(payload);
      throw new Error(text ?? "Gemini 가 이미지를 반환하지 않았습니다.");
    }
    return images;
  },
};
