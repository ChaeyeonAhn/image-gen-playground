import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import type { ProviderId } from "./providers";
import type { Generation, GeneratedImage, Mode, Status } from "./types";

interface GenerationRow {
  id: string;
  created_at: number;
  mode: string;
  provider: string;
  model: string;
  prompt: string;
  size: string | null;
  seed: number | null;
  watermark: number;
  ref_image: string | null;
  status: string;
  error: string | null;
  latency_ms: number | null;
}

interface ImageRow {
  id: string;
  generation_id: string;
  idx: number;
  file_path: string;
  source_url: string | null;
}

function toImage(row: ImageRow): GeneratedImage {
  return { id: row.id, idx: row.idx, filePath: row.file_path, sourceUrl: row.source_url };
}

function toGeneration(row: GenerationRow, images: GeneratedImage[]): Generation {
  return {
    id: row.id,
    createdAt: row.created_at,
    mode: row.mode as Mode,
    provider: row.provider as ProviderId,
    model: row.model,
    prompt: row.prompt,
    size: row.size,
    seed: row.seed,
    watermark: row.watermark === 1,
    refImage: row.ref_image,
    status: row.status as Status,
    error: row.error,
    latencyMs: row.latency_ms,
    images,
  };
}

export interface InsertGenerationInput {
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
  images: Array<{ filePath: string; sourceUrl: string | null }>;
}

/** 생성 결과와 이미지들을 한 트랜잭션으로 기록하고, 저장된 레코드를 그대로 돌려준다. */
export function insertGeneration(input: InsertGenerationInput): Generation {
  const db = getDb();
  const id = randomUUID();
  const createdAt = Date.now();

  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO generations
         (id, created_at, mode, provider, model, prompt, size, seed, watermark, ref_image, status, error, latency_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      createdAt,
      input.mode,
      input.provider,
      input.model,
      input.prompt,
      input.size,
      input.seed,
      input.watermark ? 1 : 0,
      input.refImage,
      input.status,
      input.error,
      input.latencyMs,
    );

    const insertImage = db.prepare(
      `INSERT INTO images (id, generation_id, idx, file_path, source_url) VALUES (?, ?, ?, ?, ?)`,
    );
    input.images.forEach((image, idx) => {
      insertImage.run(randomUUID(), id, idx, image.filePath, image.sourceUrl);
    });
  });

  run();
  return getGeneration(id)!;
}

export function getGeneration(id: string): Generation | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM generations WHERE id = ?`).get(id) as GenerationRow | undefined;
  if (!row) return null;
  const images = db
    .prepare(`SELECT * FROM images WHERE generation_id = ? ORDER BY idx`)
    .all(id) as ImageRow[];
  return toGeneration(row, images.map(toImage));
}

/** 최신순 히스토리. limit 보다 하나 더 읽어 다음 페이지 존재 여부를 판단한다. */
export function listGenerations(limit: number, offset: number): { items: Generation[]; hasMore: boolean } {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM generations ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(limit + 1, offset) as GenerationRow[];

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  if (page.length === 0) return { items: [], hasMore: false };

  const placeholders = page.map(() => "?").join(",");
  const imageRows = db
    .prepare(`SELECT * FROM images WHERE generation_id IN (${placeholders}) ORDER BY idx`)
    .all(...page.map((r) => r.id)) as ImageRow[];

  const byGeneration = new Map<string, GeneratedImage[]>();
  for (const row of imageRows) {
    const list = byGeneration.get(row.generation_id) ?? [];
    list.push(toImage(row));
    byGeneration.set(row.generation_id, list);
  }

  return {
    items: page.map((row) => toGeneration(row, byGeneration.get(row.id) ?? [])),
    hasMore,
  };
}
