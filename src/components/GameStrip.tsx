import { useEffect, useState } from "react";
import type { CompanyResult, GameItem } from "../types.ts";
import { useGames } from "../lib/games.tsx";
import { Icon } from "./Icon.tsx";
import { CompanyLogo } from "./CompanyLogo.tsx";

const ROLE_TEXT: Record<GameItem["role"], string> = { dev: "開発", pub: "発売・運営", both: "開発・発売" };

/** ゲームの小さなアイコン。画像が無い・読めないときは題名の頭の文字 */
export function GameIcon({ g, size = 34 }: { g: GameItem; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (!g.icon || broken) {
    // 題名から色を決めて、同じゲームはいつも同じ色にする
    let h = 0;
    for (const ch of g.title) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return (
      <span className="game-icon game-icon--text" style={{ width: size, height: size, background: `hsl(${h} 45% 52%)` }} aria-hidden>
        {[...g.title.replace(/^[「『【\s]+/, "")].slice(0, 2).join("")}
      </span>
    );
  }
  return (
    <span className={`game-icon game-icon--${g.iconShape ?? "square"}`} style={{ width: size, height: size }}>
      <img src={g.icon} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
    </span>
  );
}

/** 会社の代表作を数個アイコンで並べ、「作品」ボタンで一覧を開く */
export function GameStrip({ companyId, max = 4 }: { companyId: string; max?: number }) {
  const games = useGames();
  const list = games.get(companyId)?.games ?? [];
  if (!list.length) return null;
  // アイコンのある作品を先に（見た目で分かりやすいように）
  const top = [...list.filter((g) => g.icon), ...list.filter((g) => !g.icon)].slice(0, max);
  return (
    <div className="game-strip">
      <ul className="game-strip__icons" aria-label="主な作品">
        {top.map((g) => (
          <li key={g.title} title={g.title}>
            <GameIcon g={g} />
          </li>
        ))}
      </ul>
      <button className="game-strip__more" onClick={() => games.open(companyId)} title="作った・関わったゲームの一覧">
        作品 {list.length}
        <Icon name="arrow" size={12} />
      </button>
    </div>
  );
}

/** 作品一覧の窓 */
export function GamesModal({ companies }: { companies: Map<string, CompanyResult> }) {
  const games = useGames();
  const id = games.openFor;
  const [sort, setSort] = useState<"known" | "new">("known");

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && games.close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, games]);

  if (!id) return null;
  const c = companies.get(id);
  const data = games.get(id);
  const list = [...(data?.games ?? [])].sort((a, b) =>
    sort === "new" ? (b.year ?? 0) - (a.year ?? 0) : (b.score ?? 0) - (a.score ?? 0),
  );

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="games-title" onClick={games.close}>
      <div className="modal__panel modal__panel--wide" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={games.close} aria-label="閉じる">
          <Icon name="x" size={18} />
        </button>
        <div className="games-head">
          {c && <CompanyLogo company={c} size={44} />}
          <div>
            <h2 id="games-title" className="modal__title">{c?.name ?? id} の作品</h2>
            <p className="hint">作った・関わったゲーム {list.length} 本</p>
          </div>
        </div>
        <div className="seg" role="radiogroup" aria-label="並び順">
          {([["known", "よく知られている順"], ["new", "新しい順"]] as const).map(([v, l]) => (
            <button key={v} role="radio" aria-checked={sort === v} className={`seg__item ${sort === v ? "is-active" : ""}`} onClick={() => setSort(v)}>
              {l}
            </button>
          ))}
        </div>
        <ul className="games-list">
          {list.map((g) => (
            <li key={g.title}>
              <a href={g.url} target="_blank" rel="noopener noreferrer" className={g.url ? "" : "is-plain"}>
                <GameIcon g={g} size={44} />
                <span className="games-list__body">
                  <span className="games-list__title">{g.title}</span>
                  <span className="games-list__meta">
                    {g.year && <span>{g.year}年</span>}
                    <span>{ROLE_TEXT[g.role]}</span>
                  </span>
                </span>
                {g.url && <Icon name="external" size={13} />}
              </a>
            </li>
          ))}
        </ul>
        <p className="hint">
          作品は Wikipedia（Wikidata）と App Store の情報から自動で集めています。移植や発売だけの作品が入ったり、抜けがあったりします。
        </p>
      </div>
    </div>
  );
}
