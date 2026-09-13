export type ProviderId = "ark" | "gemini";

/** 프로바이더가 돌려준 이미지 한 장. base64 이거나 만료되는 원격 URL 이다. */
export interface ProviderImage {
  b64?: string;
  mimeType?: string;
  url?: string;
}

export interface GenerateParams {
  modelId: string;
  prompt: string;
  size: string;
  seed: number | null;
  watermark: boolean;
  /** data URL. 있으면 image-to-image 로 동작한다. */
  image: string | null;
}

export interface Provider {
  id: ProviderId;
  label: string;
  /** 이 프로바이더를 켜는 환경변수 이름 — 안내 문구에 쓴다. */
  envKey: string;
  isConfigured(): boolean;
  generate(params: GenerateParams): Promise<ProviderImage[]>;
}

export const TIMEOUT_MS = 180_000;

/** data URL 을 mime 과 base64 로 쪼갠다. */
export function splitDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(dataUrl);
  if (!match) throw new Error("참조 이미지를 읽을 수 없습니다.");
  return { mimeType: match[1], data: match[2] };
}

export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  providerLabel: string,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`생성이 ${TIMEOUT_MS / 1000}초 안에 끝나지 않아 중단했습니다.`);
    }
    throw new Error(`${providerLabel} 에 연결하지 못했습니다: ${(err as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(describeError(response.status, payload, providerLabel));
  }
  return payload;
}

/** 프로바이더마다 에러 모양이 달라서, 흔한 자리들을 훑어 한 줄로 정리한다. */
function describeError(status: number, payload: unknown, providerLabel: string): string {
  if (typeof payload === "string") {
    return `${providerLabel} ${status}: ${payload.slice(0, 300)}`;
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const error = record.error;
    if (typeof error === "string") return error;
    if (error && typeof error === "object") {
      const e = error as Record<string, unknown>;
      const message = typeof e.message === "string" ? e.message : null;
      const code = typeof e.code === "string" ? e.code : null;
      if (message) return code ? `${code}: ${message}` : message;
    }
    if (typeof record.message === "string") return record.message;
  }
  return `${providerLabel} 요청이 ${status} 로 실패했습니다.`;
}
