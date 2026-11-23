import { useMemo, useState } from "react";
import type { CompanyResult } from "../types.ts";
import { formatDateTime, MAIN_PREFS, prefLabel, sortPrefs, statusOf } from "../lib/util.ts";
import { Icon } from "./Icon.tsx";
import { CompanyLogo } from "./CompanyLogo.tsx";
import { CompanyLinks } from "./CompanyLinks.tsx";
import { GameStrip } from "./GameStrip.tsx";
import { TrackButton } from "./TrackButton.tsx";

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
      .filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.tags.some((t) => t.includes(q)))
      .filter((c) => pref === "all" || c.locations?.includes(pref))
      .filter((c) => !onlyOpen || openCount(c) > 0)
      .map((c) => ({ c, open: openCount(c) }))
      // 募集の多い会社 → 収集している会社 → それ以外（名前順）
      .sort((a, b) => b.open - a.open || Number(b.c.enabled) - Number(a.c.enabled) || a.c.name.localeCompare(b.c.name, "ja"));
  }, [companies, q, pref, onlyOpen]);

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
        <label className="search">
          <Icon name="search" size={15} />
          <input type="search" placeholder="会社名で探す" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="select">
          <span>地域</span>
          <select value={pref} onChange={(e) => changePref(e.target.value)}>
            <option value="all">すべて</option>
            {prefs.map((p) => (
              <option key={p} value={p}>{prefLabel(p)}</option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
          募集が載っている会社だけ
        </label>
      </div>
      <p className="section__lead">
        下のボタンで新卒採用・インターン・給与・企業理念のページへ直接飛べます。「作品」で、その会社が作った・関わったゲームの一覧が見られます。灰色の会社は、新卒・インターンの募集が見つからない等の理由で自動確認の対象外です。
      </p>
      <div className="company-grid">
        {list.map(({ c, open }) => (
          <div key={c.id} className={`company ${c.enabled ? "" : "is-off"}`}>
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
              {c.digest && <span className="company__digest">{c.digest}</span>}
              {open === 0 && c.previous && (
                <a className="company__prev" href={c.previous.sourceUrl} target="_blank" rel="noopener noreferrer" title="出典のページを開く">
                  <Icon name="clock" size={12} />
                  <span>
                    <b>去年の目安</b> {c.previous.text}
                  </span>
                  <Icon name="external" size={11} />
                </a>
              )}
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
            <span className="company__count">
              <b>{open}</b>
              <small>件</small>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
