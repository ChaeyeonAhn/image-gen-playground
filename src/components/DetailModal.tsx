"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ModelOption } from "@/lib/providers";
import type { Generation } from "@/lib/types";

interface Props {
  generation: Generation;
  models: ModelOption[];
  onClose: () => void;
  onReuse: (generation: Generation) => void;
}

function formatTime(ms: number) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(ms),
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-2.5 text-[14px]">
      <span className="w-20 shrink-0 text-faint">{label}</span>
      <span className="min-w-0 flex-1 break-words text-muted">{children}</span>
    </div>
  );
}

export default function DetailModal({ generation, models, onClose, onReuse }: Props) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const image = generation.images[active];
  const model = models.find((m) => m.id === generation.model);

  async function copyPrompt() {
    await navigator.clipboard.writeText(generation.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="생성 결과"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-[var(--r-lg)] bg-surface lg:flex-row">
        <div className="flex min-h-[220px] flex-1 items-center justify-center bg-sunken p-4">
          {image ? (
            <Image
              src={image.filePath}
              alt={generation.prompt}
              width={1024}
              height={1024}
              unoptimized
              className="max-h-[45vh] w-auto max-w-full rounded-[8px] object-contain lg:max-h-[72vh]"
            />
          ) : (
            <p className="max-w-[34ch] text-center text-[14px] leading-relaxed text-alarm">
              {generation.error ?? "만들지 못했습니다."}
            </p>
          )}
        </div>

        <div className="flex w-full shrink-0 flex-col overflow-y-auto p-6 lg:w-[340px]">
          <p className="mb-5 whitespace-pre-wrap text-[15px] leading-relaxed text-text">
            {generation.prompt}
          </p>

          {generation.images.length > 1 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {generation.images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`h-12 w-12 overflow-hidden rounded-[8px] transition-opacity ${
                    i === active ? "ring-2 ring-text" : "opacity-50 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img.filePath}
                    alt={`결과 ${i + 1}`}
                    width={48}
                    height={48}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="mb-6 divide-y divide-border">
            <Row label="모델">{model?.label ?? generation.model}</Row>
            <Row label="해상도">{generation.size ?? "-"}</Row>
            {generation.seed !== null && <Row label="시드">{generation.seed}</Row>}
            {generation.mode === "i2i" && generation.refImage && (
              <Row label="참조 이미지">
                <Image
                  src={generation.refImage}
                  alt="참조 이미지"
                  width={64}
                  height={64}
                  unoptimized
                  className="h-16 w-16 rounded-[8px] object-cover"
                />
              </Row>
            )}
            <Row label="걸린 시간">
              {generation.latencyMs === null ? "-" : `${(generation.latencyMs / 1000).toFixed(1)}초`}
            </Row>
            <Row label="만든 때">{formatTime(generation.createdAt)}</Row>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onReuse(generation)}
              className="rounded-full bg-text px-4 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-85"
            >
              이 설정으로 다시 만들기
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void copyPrompt()}
                className="flex-1 rounded-full bg-sunken px-4 py-3 text-[14px] font-medium text-muted transition-colors hover:text-text"
              >
                {copied ? "복사했어요" : "프롬프트 복사"}
              </button>
              {image && (
                <a
                  href={image.filePath}
                  download
                  className="flex-1 rounded-full bg-sunken px-4 py-3 text-center text-[14px] font-medium text-muted transition-colors hover:text-text"
                >
                  내려받기
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="py-2 text-[14px] text-faint transition-colors hover:text-text"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
