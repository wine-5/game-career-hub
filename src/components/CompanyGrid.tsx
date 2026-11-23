import { useMemo, useState } from "react";
import type { CompanyResult } from "../types.ts";
import { formatDateTime, statusOf } from "../lib/util.ts";
import { KIcon } from "./Icons.tsx";

export function CompanyGrid({ companies }: { companies: CompanyResult[] }) {
  const [q, setQ] = useState("");
  const list = useMemo(
    () =>
      companies
        .filter((c) => !q || c.name.includes(q) || c.tags.some((t) => t.includes(q)))
        .sort((a, b) => Number(b.enabled) - Number(a.enabled)),
    [companies, q],
  );

  return (
    <section className="section">
      <div className="section__head">
        <h2 className="section__title">
          <KIcon name="home" size={20} /> 監視中の会社
        </h2>
        <label className="search search--sm">
          <KIcon name="target" size={14} />
          <input type="search" placeholder="会社を探す" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <p className="section__lead">
        AI が毎日見に行っている会社の一覧です。追加してほしい会社は GitHub の Issue で教えてください。
      </p>
      <div className="company-grid">
        {list.map((c) => {
          const open = c.openings.filter((o) => statusOf(o) !== "closed").length;
          return (
            <a key={c.id} className={`company ${c.enabled ? "" : "is-off"}`} href={c.url} target="_blank" rel="noopener noreferrer">
              <span className="company__avatar">{c.name.slice(0, 1)}</span>
              <span className="company__body">
                <span className="company__name">{c.name}</span>
                <span className="company__tags">
                  {c.tags.map((t) => (
                    <span key={t} className="tag">{t}</span>
                  ))}
                </span>
                {c.digest && <span className="company__digest">{c.digest}</span>}
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
              </span>
              <span className="company__count">
                <b>{open}</b>
                <small>件</small>
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
