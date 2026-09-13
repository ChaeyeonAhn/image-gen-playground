"use client";

import Image from "next/image";
import type { Generation } from "@/lib/types";

interface Props {
  generations: Generation[];
  pendingPrompt: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onOpen: (generation: Generation) => void;
}

interface Tile {
  key: string;
  generation: Generation;
  src: string | null;
}

/** 한 번의 생성이 여러 장을 돌려줄 수 있으므로 이미지 단위로 펼쳐 놓는다. */
function toTiles(generations: Generation[]): Tile[] {
  return generations.flatMap<Tile>((generation) => {
    if (generation.images.length === 0) {
      return [{ key: generation.id, generation, src: null }];
    }
    return generation.images.map((image) => ({
      key: image.id,
      generation,
      src: image.filePath,
    }));
  });
}

export default function Gallery({
  generations,
  pendingPrompt,
  hasMore,
  loadingMore,
  onLoadMore,
  onOpen,
}: Props) {
  const tiles = toTiles(generations);

  if (tiles.length === 0 && pendingPrompt === null) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-8">
        <p className="max-w-[32ch] text-center text-[15px] leading-relaxed text-faint">
          왼쪽에 프롬프트를 쓰고 만들기를 누르면 결과가 여기에 쌓여요.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 lg:py-6 lg:pr-6">
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}
      >
        {pendingPrompt !== null && (
          <div className="sweep relative aspect-square overflow-hidden rounded-[var(--r-md)] bg-sunken">
            <p className="absolute inset-x-0 bottom-0 line-clamp-2 p-4 text-[13px] leading-snug text-faint">
              {pendingPrompt}
            </p>
          </div>
        )}

        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => onOpen(tile.generation)}
            className="group relative aspect-square overflow-hidden rounded-[var(--r-md)] bg-sunken text-left"
          >
            {tile.src ? (
              <>
                <Image
                  src={tile.src}
                  alt={tile.generation.prompt}
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 50vw, 240px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                <p className="absolute inset-x-0 bottom-0 line-clamp-3 p-4 text-[13px] leading-snug text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {tile.generation.prompt}
                </p>
              </>
            ) : (
              <div className="flex h-full flex-col gap-2 bg-surface p-4">
                <span className="text-[13px] font-medium text-alarm">만들지 못했어요</span>
                <p className="line-clamp-6 text-[13px] leading-snug text-faint">
                  {tile.generation.prompt}
                </p>
              </div>
            )}
          </button>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center py-10">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="rounded-full bg-surface px-6 py-2.5 text-[14px] font-medium text-muted transition-colors hover:text-text disabled:opacity-40"
          >
            {loadingMore ? "불러오는 중" : "더 보기"}
          </button>
        </div>
      )}
    </div>
  );
}
