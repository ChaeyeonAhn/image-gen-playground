import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { ProviderImage } from "./providers";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const GENERATED_DIR = path.join(PUBLIC_DIR, "generated");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function extFromContentType(contentType: string | null): string {
  if (!contentType) return "png";
  return EXT_BY_MIME[contentType.split(";")[0].trim().toLowerCase()] ?? "png";
}

/**
 * 프로바이더가 주는 URL 은 하루 안에 만료된다.
 * 갤러리가 영구적으로 남으려면 생성 직후 반드시 로컬에 내려받아야 한다.
 */
export async function persistGeneratedImages(
  images: ProviderImage[],
): Promise<Array<{ filePath: string; sourceUrl: string | null }>> {
  await fs.mkdir(GENERATED_DIR, { recursive: true });

  const saved: Array<{ filePath: string; sourceUrl: string | null }> = [];

  for (const image of images) {
    if (image.b64) {
      const ext = EXT_BY_MIME[image.mimeType ?? "image/png"] ?? "png";
      const fileName = `${randomUUID()}.${ext}`;
      await fs.writeFile(path.join(GENERATED_DIR, fileName), Buffer.from(image.b64, "base64"));
      saved.push({ filePath: `/generated/${fileName}`, sourceUrl: null });
      continue;
    }

    if (!image.url) continue;

    const response = await fetch(image.url);
    if (!response.ok) {
      throw new Error(`생성된 이미지를 내려받지 못했습니다 (HTTP ${response.status}).`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const fileName = `${randomUUID()}.${extFromContentType(response.headers.get("content-type"))}`;
    await fs.writeFile(path.join(GENERATED_DIR, fileName), buffer);
    saved.push({ filePath: `/generated/${fileName}`, sourceUrl: image.url });
  }

  if (saved.length === 0) {
    throw new Error("저장할 이미지가 없습니다.");
  }
  return saved;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function saveUpload(file: File): Promise<string> {
  const ext = EXT_BY_MIME[file.type] ?? null;
  if (!ext) {
    throw new Error("PNG, JPEG, WebP, GIF 이미지만 올릴 수 있습니다.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`이미지가 너무 큽니다. ${MAX_UPLOAD_BYTES / 1024 / 1024}MB 이하로 올려주세요.`);
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const fileName = `${randomUUID()}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, fileName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${fileName}`;
}

/**
 * 참조 이미지를 data URL 로 바꿔 프로바이더에 넘긴다.
 * 로컬 개발 서버라 외부에서 접근 가능한 URL 을 줄 수 없으므로 base64 로 보낸다.
 */
export async function refImageToDataUrl(publicPath: string): Promise<string> {
  const fileName = path.basename(publicPath);
  if (!publicPath.startsWith("/uploads/") || fileName.includes("..")) {
    throw new Error("참조 이미지 경로가 올바르지 않습니다.");
  }

  const absolute = path.join(UPLOAD_DIR, fileName);
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(absolute);
  } catch {
    // 내부 파일 경로가 응답에 새지 않도록 감싼다.
    throw new Error("참조 이미지를 찾을 수 없습니다. 다시 올려주세요.");
  }
  const ext = path.extname(fileName).slice(1).toLowerCase();
  const mime = Object.entries(EXT_BY_MIME).find(([, e]) => e === (ext === "jpeg" ? "jpg" : ext))?.[0] ?? "image/png";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}
