import { useMemo, useState } from "react";
import type { CompanyResult } from "../types.ts";
import { formatDateTime, MAIN_PREFS, prefLabel, sortPrefs, statusOf } from "../lib/util.ts";
import { Icon } from "./Icon.tsx";
import { CompanyLogo } from "./CompanyLogo.tsx";
import { CompanyLinks } from "./CompanyLinks.tsx";
import { GameStrip } from "./GameStrip.tsx";
import { TrackButton } from "./TrackButton.tsx";
import { SearchSuggest } from "./SearchSuggest.tsx";
import { SourceLink } from "./SourceLink.tsx";
import { companyTargets, score } from "../lib/search.ts";
import { useAuth } from "../lib/auth.tsx";
import { CONDITION_SORT_LABEL, conditionKey, isConditionSort, matchConditions, NO_CONDITION, type ConditionFilter, type ConditionSort } from "../lib/conditions.ts";
import { ConditionSelects } from "./ConditionSelects.tsx";
import { ConditionChips } from "./ConditionChips.tsx";

type CompanySort = "open" | ConditionSort | "name";

/** お気に入りに会社を入れるときのキー（募集のお気に入りと同じ表に入れる） */
export const companyFavKey = (id: string) => `company:${id}`;

export function CompanyGrid({ companies }: { companies: CompanyResult[] }) {
  const [q, setQ] = useState("");
  const [pref, setPref] = useState<string>(() => {
    try {
      return localStorage.getItem("gch.companyPref") ?? "all";
    } catch {
      return "all";
    }
  });
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [sort, setSort] = useState<CompanySort>("open");
  const [cond, setCond] = useState<ConditionFilter>(NO_CONDITION);
  const prefs = useMemo(() => sortPrefs(companies.flatMap((c) => c.locations ?? [])), [companies]);
  const prefCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of companies) for (const p of c.locations ?? []) m.set(p, (m.get(p) ?? 0) + 1);
    return m;
  }, [companies]);

  const changePref = (p: string) => {
    setPref(p);
    try {
      localStorage.setItem("gch.companyPref", p);
    } catch {
      /* 覚えられない環境では覚えないだけ */
    }
  };

  const list = useMemo(() => {
    const openCount = (c: CompanyResult) => c.openings.filter((o) => statusOf(o) !== "closed").length;
    return companies
      // 表記ゆれ・少しの打ち間違いも許して当てる
      .filter((c) => !q.trim() || score(q, companyTargets(c)) > 0)
      .filter((c) => pref === "all" || c.locations?.includes(pref))
      .filter((c) => !onlyOpen || openCount(c) > 0)
      .filter((c) => matchConditions(c.conditions, cond))
      // 待遇で並べるときは、その数字が書かれていない会社は外す
      .filter((c) => !isConditionSort(sort) || conditionKey(c.conditions, sort) !== null)
      .map((c) => ({ c, open: openCount(c) }))
      .sort((a, b) => {
        const byName = a.c.name.localeCompare(b.c.name, "ja");
        if (sort === "name") return byName;
        if (isConditionSort(sort)) return conditionKey(b.c.conditions, sort)! - conditionKey(a.c.conditions, sort)! || b.open - a.open || byName;
        // 募集の多い会社 → 収集している会社 → それ以外（名前順）
        return b.open - a.open || Number(b.c.enabled) - Number(a.c.enabled) || byName;
      });
  }, [companies, q, pref, onlyOpen, sort, cond]);

  return (
    <section className="section">
      <div className="section__head">
        <h2 className="section__title">
          <Icon name="building" size={20} /> 会社
          <span className="count-pill">{list.length}</span>
        </h2>
      </div>
      <div className="roles" role="tablist" aria-label="地域で絞り込む">
        <button role="tab" aria-selected={pref === "all"} className={`role-chip ${pref === "all" ? "is-active" : ""}`} onClick={() => changePref("all")}>
          すべての地域 <span className="role-chip__count">{companies.length}</span>
        </button>
        {MAIN_PREFS.filter((p) => prefCount.has(p)).map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={pref === p}
            className={`role-chip ${pref === p ? "is-active" : ""}`}
            onClick={() => changePref(pref === p ? "all" : p)}
          >
            <Icon name="pin" size={13} />
            {prefLabel(p)}
            <span className="role-chip__count">{prefCount.get(p)}</span>
          </button>
        ))}
      </div>
      <div className="filters">
        <SearchSuggest value={q} onChange={setQ} onPick={(c) => setQ(c.name)} companies={companies} placeholder="会社名で探す" />
        <label className="select">
          <span>地域</span>
          <select value={pref} onChange={(e) => changePref(e.target.value)}>
            <option value="all">すべて</option>
            {prefs.map((p) => (
              <option key={p} value={p}>{prefLabel(p)}</option>
            ))}
          </select>
        </label>
        <label className="select">
          <span>並び順</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as CompanySort)}>
            <option value="open">募集が多い順</option>
            {(Object.keys(CONDITION_SORT_LABEL) as ConditionSort[]).map((s) => (
              <option key={s} value={s}>{CONDITION_SORT_LABEL[s]}</option>
            ))}
            <option value="name">会社名順</option>
          </select>
        </label>
        <ConditionSelects f={cond} set={(p) => setCond((c) => ({ ...c, ...p }))} />
        <label className="check">
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
          募集が載っている会社だけ
        </label>
      </div>
      <p className="section__lead">
        下のボタンで新卒採用・インターン・給与・企業理念のページへ直接飛べます。「作品」で、その会社が作った・関わったゲームの一覧が見られます。初任給・年間休日・平均残業は、採用ページに数字が書かれている会社だけに出します（その条件で並べる・絞るときは、書かれていない会社は対象外になります）。灰色の会社は、新卒・インターンの募集が見つからない等の理由で自動確認の対象外です。
      </p>
      <div className="company-grid">
        {list.map(({ c, open }) => (
          <CompanyCard key={c.id} c={c} open={open} />
        ))}
      </div>
    </section>
  );
}

function FavButton({ on, loggedIn, onClick }: { on: boolean; loggedIn: boolean; onClick: () => void }) {
  return (
    <button
      className={`fav ${on ? "is-on" : ""}`}
      aria-pressed={on}
      aria-label="会社をお気に入りに入れる"
      title={on ? "お気に入りから外す" : loggedIn ? "会社をお気に入りに追加" : "ログインするとお気に入りに追加できます"}
      onClick={onClick}
    >
      <Icon name="star" size={17} />
    </button>
  );
}

/** 会社 1 社のカード（会社の一覧とお気に入りで使う） */
export function CompanyCard({ c, open }: { c: CompanyResult; open: number }) {
  const auth = useAuth();
  return (
      <div className={`company ${c.enabled ? "" : "is-off"}`}>
        <CompanyLogo company={c} size={48} href={c.site ?? c.url} />
        <div className="company__body">
          <span className="company__name">
            <a href={c.site ?? c.url} target="_blank" rel="noopener noreferrer">{c.name}</a>
          </span>
          <span className="company__tags">
            {c.locations?.map((p) => (
              <span key={p} className="tag tag--place">
                <Icon name="pin" size={11} />
                {p}
              </span>
            ))}
            {c.tags.map((t) => (
              <span key={t} className="tag">{t}</span>
            ))}
          </span>
          {c.digest && (
            <span className="company__digest">
              {c.digest} <SourceLink url={c.url} />
            </span>
          )}
          {open === 0 && c.previous && (
            <a className="company__prev" href={c.previous.sourceUrl} target="_blank" rel="noopener noreferrer" title="出典のページを開く">
              <Icon name="clock" size={12} />
              <span>
                <b>去年の目安</b> {c.previous.text}
              </span>
              <Icon name="external" size={11} />
            </a>
          )}
          <ConditionChips k={c.conditions} />
          <GameStrip companyId={c.id} />
          <span className="company__meta">
            {c.enabled ? (
              <>
                <span className={`dot ${c.error ? "dot--warn" : "dot--ok"}`} />
                {c.error ? c.error : `確認 ${formatDateTime(c.lastChecked)}`}
              </>
            ) : (
              <>
                <span className="dot dot--off" />
                {c.note ?? "自動確認の対象外"}
              </>
            )}
          </span>
          <div className="company__links">
            <CompanyLinks links={{ newgrad: c.links?.newgrad ?? (c.enabled ? c.url : undefined), ...c.links }} />
            <TrackButton companyId={c.id} companyName={c.name} />
          </div>
        </div>
        <span className="company__side">
          <span className="company__count">
            <b>{open}</b>
            <small>件</small>
          </span>
          <FavButton on={auth.favorites.has(companyFavKey(c.id))} loggedIn={Boolean(auth.session)} onClick={() => auth.toggleFavorite(companyFavKey(c.id), { title: c.name, company: c.name })} />
        </span>
      </div>
  );
}
