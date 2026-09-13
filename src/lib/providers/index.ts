import { arkProvider } from "./ark";
import { geminiProvider } from "./gemini";
import type { Provider, ProviderId } from "./types";

export type { GenerateParams, ProviderId, ProviderImage } from "./types";

const PROVIDERS: Record<ProviderId, Provider> = {
  ark: arkProvider,
  gemini: geminiProvider,
};

export function getProvider(id: ProviderId): Provider {
  return PROVIDERS[id];
}

export interface ModelOption {
  /** 앱 안에서 쓰는 고유 키. DB 에도 이 값이 저장된다. */
  id: string;
  provider: ProviderId;
  providerLabel: string;
  /** 프로바이더에 실제로 보내는 모델 이름. */
  modelId: string;
  label: string;
  note: string;
  sizes: string[];
  supportsImageInput: boolean;
  supportsSeed: boolean;
  supportsWatermark: boolean;
}

/**
 * 쓸 수 있는 모델 목록.
 *
 * 모델 이름은 각 콘솔의 모델 목록에 적힌 값이어야 한다.
 * 이름이 바뀌면 여기만 고치면 된다.
 */
const CATALOG: Array<Omit<ModelOption, "id" | "providerLabel">> = [
  {
    provider: "ark",
    modelId: "seedream-4-0-250828",
    label: "Seedream 4.0",
    note: "묘사를 촘촘히 따라가는 편",
    sizes: ["1K", "2K", "4K"],
    supportsImageInput: true,
    supportsSeed: true,
    supportsWatermark: true,
  },
  {
    provider: "ark",
    modelId: "seedream-5-0-lite",
    label: "Seedream 5.0 Lite",
    note: "가볍고 빠른 쪽",
    sizes: ["1K", "2K", "4K"],
    supportsImageInput: true,
    supportsSeed: true,
    supportsWatermark: true,
  },
  {
    provider: "gemini",
    modelId: "gemini-3.1-flash-image",
    label: "Nano Banana 2",
    note: "빠르고 글자를 잘 씀",
    sizes: ["1K", "2K", "4K"],
    supportsImageInput: true,
    supportsSeed: false,
    supportsWatermark: false,
  },
  {
    provider: "gemini",
    modelId: "gemini-3.1-flash-lite-image",
    label: "Nano Banana 2 Lite",
    note: "가장 빠름, 1K 만",
    sizes: ["1K"],
    supportsImageInput: true,
    supportsSeed: false,
    supportsWatermark: false,
  },
  {
    provider: "gemini",
    modelId: "gemini-3-pro-image",
    label: "Nano Banana Pro",
    note: "가장 공들여 그림",
    sizes: ["1K", "2K", "4K"],
    supportsImageInput: true,
    supportsSeed: false,
    supportsWatermark: false,
  },
];

export function getModels(): ModelOption[] {
  return CATALOG.map((entry) => ({
    ...entry,
    id: `${entry.provider}:${entry.modelId}`,
    providerLabel: PROVIDERS[entry.provider].label,
  }));
}

/** 키가 있는 프로바이더의 모델만. 하나도 없으면 전부 돌려주고 UI 가 안내를 띄운다. */
export function getAvailableModels(): { models: ModelOption[]; ready: boolean } {
  const models = getModels().filter((m) => PROVIDERS[m.provider].isConfigured());
  return models.length > 0 ? { models, ready: true } : { models: getModels(), ready: false };
}

export function getMissingKeys(): string[] {
  return Object.values(PROVIDERS)
    .filter((p) => !p.isConfigured())
    .map((p) => p.envKey);
}
