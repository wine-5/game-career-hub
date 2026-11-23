import { useMemo, useState } from "react";
import type { CompanyResult } from "../types.ts";
import { formatDateTime, statusOf } from "../lib/util.ts";
import { Icon } from "./Icon.tsx";
import { CompanyLogo } from "./CompanyLogo.tsx";
import { CompanyLinks } from "./CompanyLinks.tsx";

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
          <Icon name="building" size={20} /> 会社
        </h2>
        <label className="search" style={{ flex: "0 1 260px" }}>
          <Icon name="search" size={15} />
          <input type="search" placeholder="会社を探す" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <p className="section__lead">
        採用ページを確認している会社です。右のボタンで新卒採用・インターン・企業理念のページへ直接飛べます。
      </p>
      <div className="company-grid">
        {list.map((c) => {
          const open = c.openings.filter((o) => statusOf(o) !== "closed").length;
          return (
            <div key={c.id} className={`company ${c.enabled ? "" : "is-off"}`}>
              <CompanyLogo company={c} size={48} />
              <div className="company__body">
                <span className="company__name">
                  <a href={c.url} target="_blank" rel="noopener noreferrer">{c.name}</a>
                </span>
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
                <div className="company__links">
                  <CompanyLinks links={c.links} />
                </div>
              </div>
              <span className="company__count">
                <b>{open}</b>
                <small>件</small>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
