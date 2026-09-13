"use client";

import { useCallback, useState } from "react";
import DetailModal from "./DetailModal";
import Gallery from "./Gallery";
import PromptPanel, { type FormState } from "./PromptPanel";
import type { ModelOption } from "@/lib/providers";
import type { Generation } from "@/lib/types";

interface Props {
  models: ModelOption[];
  ready: boolean;
  missingKeys: string[];
  initialGenerations: Generation[];
  initialHasMore: boolean;
}

export default function Playground({
  models,
  ready,
  missingKeys,
  initialGenerations,
  initialHasMore,
}: Props) {
  const first = models[0];
  const [form, setForm] = useState<FormState>({
    model: first?.id ?? "",
    prompt: "",
    size: first?.sizes.includes("2K") ? "2K" : (first?.sizes[0] ?? ""),
    seed: "",
    watermark: false,
    refImage: null,
  });

  const [generations, setGenerations] = useState<Generation[]>(initialGenerations);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Generation | null>(null);

  const generate = useCallback(async () => {
    const prompt = form.prompt.trim();
    if (!prompt) return;

    setPendingPrompt(prompt);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: form.model,
          prompt,
          size: form.size,
          seed: form.seed.trim() === "" ? null : Number(form.seed),
          watermark: form.watermark,
          refImage: form.refImage,
        }),
      });

      const data = (await res.json()) as { generation?: Generation; error?: string };

      // 실패한 생성도 서버가 기록해 돌려주므로 갤러리에 그대로 얹는다.
      if (data.generation) {
        setGenerations((prev) => [data.generation!, ...prev]);
      }
      if (!res.ok) setError(data.error ?? "만들지 못했습니다.");
    } catch {
      setError("서버에 연결하지 못했습니다.");
    } finally {
      setPendingPrompt(null);
    }
  }, [form]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/generations?offset=${generations.length}`);
      const data = (await res.json()) as { items: Generation[]; hasMore: boolean };
      setGenerations((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
    } catch {
      setError("히스토리를 더 불러오지 못했습니다.");
    } finally {
      setLoadingMore(false);
    }
  }, [generations.length]);

  function reuse(generation: Generation) {
    const model = models.find((m) => m.id === generation.model);
    setForm({
      model: model?.id ?? form.model,
      prompt: generation.prompt,
      size: generation.size ?? form.size,
      seed: generation.seed === null ? "" : String(generation.seed),
      watermark: generation.watermark,
      refImage: generation.refImage,
    });
    setDetail(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:flex-row lg:overflow-hidden">
      <aside className="shrink-0 p-3 lg:w-[380px] lg:py-6 lg:pl-6 lg:pr-3">
        <div className="h-full overflow-hidden rounded-[var(--r-lg)] bg-surface">
          <PromptPanel
            header={
              <>
                <header>
                  <h1 className="text-[19px] font-semibold tracking-tight">Light Table</h1>
                  <p className="mt-1 text-[13px] text-faint">프롬프트를 쓰고 결과를 바로 보는 작업대</p>
                </header>

                {!ready && (
                  <div className="rounded-[var(--r-sm)] bg-sunken p-4">
                    <p className="text-[13px] leading-relaxed text-muted">
                      아직 API 키가 없어요. 프로젝트의 <code className="text-text">.env.local</code> 에{" "}
                      {missingKeys.map((key, i) => (
                        <span key={key}>
                          {i > 0 && " 또는 "}
                          <code className="text-text">{key}</code>
                        </span>
                      ))}{" "}
                      를 넣고 서버를 다시 시작하세요.
                    </p>
                  </div>
                )}

                {error && (
                  <p className="text-[13px] leading-relaxed text-alarm" role="alert">
                    {error}
                  </p>
                )}
              </>
            }
            models={models}
            value={form}
            onChange={setForm}
            onSubmit={() => void generate()}
            isGenerating={pendingPrompt !== null}
            ready={ready}
          />
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:overflow-y-auto">
        <Gallery
          generations={generations}
          pendingPrompt={pendingPrompt}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={() => void loadMore()}
          onOpen={setDetail}
        />
      </main>

      {detail && (
        <DetailModal
          generation={detail}
          models={models}
          onClose={() => setDetail(null)}
          onReuse={reuse}
        />
      )}
    </div>
  );
}
