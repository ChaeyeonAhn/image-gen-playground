import { postJson, type GenerateParams, type Provider, type ProviderImage } from "./types";

const DEFAULT_BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3";

interface ArkResponse {
  data?: Array<{ url?: string; b64_json?: string }>;
}

/** BytePlus ModelArk (Seedream). OpenAI 호환 스키마에 확장 필드가 얹혀 있다. */
export const arkProvider: Provider = {
  id: "ark",
  label: "BytePlus",
  envKey: "ARK_API_KEY",

  isConfigured() {
    return Boolean(process.env.ARK_API_KEY?.trim());
  },

  async generate(params: GenerateParams): Promise<ProviderImage[]> {
    const apiKey = process.env.ARK_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("ARK_API_KEY 가 설정되지 않았습니다. .env.local 을 확인하세요.");
    }

    const baseUrl = (process.env.ARK_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");

    const body: Record<string, unknown> = {
      model: params.modelId,
      prompt: params.prompt,
      size: params.size,
      response_format: "url",
      watermark: params.watermark,
      sequential_image_generation: "disabled",
    };
    if (params.seed !== null) body.seed = params.seed;
    if (params.image) body.image = params.image;

    const payload = (await postJson(
      `${baseUrl}/images/generations`,
      { Authorization: `Bearer ${apiKey}` },
      body,
      "BytePlus",
    )) as ArkResponse;

    const images = (payload.data ?? [])
      .map((item): ProviderImage | null => {
        if (item.b64_json) return { b64: item.b64_json, mimeType: "image/png" };
        if (item.url) return { url: item.url };
        return null;
      })
      .filter((item): item is ProviderImage => item !== null);

    if (images.length === 0) {
      throw new Error("BytePlus 가 이미지를 반환하지 않았습니다.");
    }
    return images;
  },
};
