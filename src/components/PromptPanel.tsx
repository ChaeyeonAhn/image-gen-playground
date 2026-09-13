"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ModelOption } from "@/lib/providers";

export interface FormState {
  model: string;
  prompt: string;
  size: string;
  seed: string;
  watermark: boolean;
  refImage: string | null;
}

interface Props {
  /** 패널 맨 위에 함께 스크롤될 내용 (제목, 안내). */
  header: React.ReactNode;
  models: ModelOption[];
  value: FormState;
  onChange: (next: FormState) => void;
  onSubmit: () => void;
  isGenerating: boolean;
  ready: boolean;
}

const field =
  "w-full rounded-[var(--r-sm)] bg-sunken px-3 py-2.5 text-[14px] text-text " +
  "transition-colors placeholder:text-faint focus:bg-white focus:outline-none " +
  "focus:ring-2 focus:ring-text/15";

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[13px] font-medium text-muted">
      {children}
    </label>
  );
}

export default function PromptPanel({ header, models, value, onChange, onSubmit, isGenerating, ready }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const model = models.find((m) => m.id === value.model) ?? models[0];
  const canSubmit = ready && !isGenerating && value.prompt.trim().length > 0;

  function set<K extends keyof FormState>(key: K, next: FormState[K]) {
    const updated = { ...value, [key]: next };

    // 모델을 바꾸면 새 모델이 못 받는 설정은 조용히 정리한다.
    if (key === "model") {
      const nextModel = models.find((m) => m.id === next);
      if (nextModel) {
        if (!nextModel.supportsImageInput) updated.refImage = null;
        if (!nextModel.supportsSeed) updated.seed = "";
        if (!nextModel.supportsWatermark) updated.watermark = false;
        if (!nextModel.sizes.includes(updated.size)) updated.size = nextModel.sizes[0];
      }
    }

    onChange(updated);
  }

  async function upload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json()) as { path?: string; error?: string };
      if (!res.ok || !data.path) throw new Error(data.error ?? "업로드에 실패했습니다.");
      set("refImage", data.path);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      className="flex h-full min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6" style={{ scrollbarGutter: "stable" }}>
      {header}

      <div>
        <Label htmlFor="prompt">프롬프트</Label>
        <textarea
          id="prompt"
          value={value.prompt}
          onChange={(e) => set("prompt", e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
              e.preventDefault();
              onSubmit();
            }
          }}
          rows={6}
          placeholder="만들고 싶은 장면을 묘사하세요. 구체적일수록 결과가 가까워집니다."
          className={`${field} resize-y leading-relaxed`}
        />
      </div>

      <div>
        <Label htmlFor="model">모델</Label>
        <div className="relative">
          <select
            id="model"
            value={value.model}
            onChange={(e) => set("model", e.target.value)}
            className={`${field} cursor-pointer appearance-none pr-9`}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} · {m.providerLabel}
              </option>
            ))}
          </select>
          <svg
            aria-hidden
            viewBox="0 0 12 12"
            className="pointer-events-none absolute right-3.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-faint"
          >
            <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {model?.note && <p className="mt-2 text-[12px] text-faint">{model.note}</p>}
      </div>

      {model && model.sizes.length > 1 && (
        <div>
          <Label>해상도</Label>
          <div className="flex gap-1.5 rounded-[var(--r-sm)] bg-sunken p-1">
            {model.sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set("size", s)}
                className={`flex-1 rounded-[7px] py-1.5 text-[13px] font-medium transition-colors ${
                  value.size === s ? "bg-white text-text shadow-sm" : "text-muted hover:text-text"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {model?.supportsSeed && (
        <div>
          <Label htmlFor="seed">시드</Label>
          <input
            id="seed"
            type="number"
            min={0}
            inputMode="numeric"
            value={value.seed}
            onChange={(e) => set("seed", e.target.value)}
            placeholder="비우면 무작위"
            className={field}
          />
        </div>
      )}

      {model?.supportsImageInput && (
        <div>
          <Label>참조 이미지</Label>
          {value.refImage ? (
            <div className="flex items-center gap-3 rounded-[var(--r-sm)] bg-sunken p-2.5">
              <Image
                src={value.refImage}
                alt="참조 이미지"
                width={48}
                height={48}
                unoptimized
                className="h-12 w-12 rounded-[8px] object-cover"
              />
              <span className="flex-1 text-[13px] text-muted">이 이미지를 바탕으로 만듭니다</span>
              <button
                type="button"
                onClick={() => set("refImage", null)}
                className="rounded-full px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-white hover:text-text"
              >
                제거
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void upload(file);
              }}
              className={`rounded-[var(--r-sm)] border border-dashed px-3 py-6 text-center transition-colors ${
                dragging ? "border-text bg-sunken" : "border-border"
              }`}
            >
              <p className="text-[13px] text-muted">
                {uploading ? "올리는 중" : "이미지를 끌어다 놓거나"}
              </p>
              {!uploading && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="mt-1 text-[13px] font-medium text-text underline underline-offset-4 transition-opacity hover:opacity-60"
                >
                  파일 선택
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                  e.target.value = "";
                }}
              />
            </div>
          )}
          {uploadError && <p className="mt-2 text-[13px] text-alarm">{uploadError}</p>}
        </div>
      )}

      {model?.supportsWatermark && (
        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-muted">
          <input
            type="checkbox"
            checked={value.watermark}
            onChange={(e) => set("watermark", e.target.checked)}
            className="h-4 w-4 rounded accent-text"
          />
          워터마크 넣기
        </label>
      )}

      </div>

      <div className="shrink-0 border-t border-border p-6">
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-full bg-text px-4 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-25"
        >
          {isGenerating ? "만드는 중" : "만들기"}
        </button>
        <p className="mt-2.5 text-center text-[12px] text-faint">⌘ + Enter 로도 만들 수 있어요</p>
      </div>
    </form>
  );
}
