import { useGames } from "../lib/games.tsx";
import type { TechKind } from "../types.ts";
import { Icon } from "./Icon.tsx";

const KIND_TITLE: Record<TechKind, string> = { engine: "エンジン", lang: "言語", gfx: "グラフィックス" };

/** 採用ページに出てくる言語・エンジンの小さな札。押すとその名前が書かれていたページ（出典）を開く */
export function TechChips({ companyId }: { companyId: string }) {
  const items = useGames().tech(companyId);
  if (!items?.length) return null;
  return (
    <div className="techs" aria-label="採用ページに出てくる言語・エンジン">
      <span className="techs__label" title="採用ページの本文に名前が出てくる物です。使う技術・求めるスキルなどの書き方は会社ごとに違うので、押して出典を確かめてください">
        <Icon name="code" size={12} />
        採用ページに出てくる技術
      </span>
      {items.map((t) => (
        <a
          key={t.name}
          className={`tech tech--${t.kind}`}
          href={t.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`${KIND_TITLE[t.kind]}: ${t.name} — 書かれていたページ（出典）を開く`}
        >
          {t.name}
        </a>
      ))}
    </div>
  );
}
