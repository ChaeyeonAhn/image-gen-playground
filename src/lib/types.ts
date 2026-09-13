import type { ProviderId } from "./providers";

export type Mode = "t2i" | "i2i";
export type Status = "ok" | "error";

export interface GeneratedImage {
  id: string;
  idx: number;
  filePath: string;
  sourceUrl: string | null;
}

export interface Generation {
  id: string;
  createdAt: number;
  mode: Mode;
  provider: ProviderId;
  model: string;
  prompt: string;
  size: string | null;
  seed: number | null;
  watermark: boolean;
  refImage: string | null;
  status: Status;
  error: string | null;
  latencyMs: number | null;
  images: GeneratedImage[];
}

export interface GenerateRequest {
  model: string;
  prompt: string;
  size: string;
  seed?: number | null;
  watermark: boolean;
  refImage?: string | null;
}
