import Playground from "@/components/Playground";
import { getAvailableModels, getMissingKeys } from "@/lib/providers";
import { listGenerations } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default function Home() {
  const { items, hasMore } = listGenerations(20, 0);
  const { models, ready } = getAvailableModels();

  return (
    <Playground
      models={models}
      ready={ready}
      missingKeys={getMissingKeys()}
      initialGenerations={items}
      initialHasMore={hasMore}
    />
  );
}
