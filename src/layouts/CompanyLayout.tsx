import { useMemo, useState } from "react";
import type { CompanyResult, Opening, Role } from "../types.ts";
import { TYPE_LABEL } from "../types.ts";
import { isNewOpening } from "../lib/util.ts";
import { closedDate, nextWhen } from "../lib/when.ts";
import { yen } from "../lib/conditions.ts";
import { useAuth } from "../lib/auth.tsx";
import { Icon } from "../components/Icon.tsx";
import { CompanyLogo } from "../components/CompanyLogo.tsx";
import { CompanyLinks } from "../components/CompanyLinks.tsx";
import { GameStrip } from "../components/GameStrip.tsx";
import { OpeningDetail } from "../components/OpeningDetail.tsx";
import { companyFavKey } from "../components/CompanyGrid.tsx";
import type { LayoutProps } from "./types.ts";
import "./company.css";

/** 会社ごと: 会社の箱の下に、その会社の募集を並べる */
export function CompanyLayout({ shown, companies, role, lastRun }: LayoutProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  // 会社の順は shown の中での最初の出現順
  const groups = useMemo(() => {
    const m = new Map<string, Opening[]>();
    for (const o of shown) {
      const arr = m.get(o.companyId);
      if (arr) arr.push(o);
      else m.set(o.companyId, [o]);
    }
    return [...m.entries()].filter(([id]) => companies.has(id));
  }, [shown, companies]);

  return (
    <>
      <div className="co-grid">
        {groups.map(([id, list]) => (
          <CompanyBox
            key={id}
            company={companies.get(id)!}
            list={list}
            role={role}
            lastRun={lastRun}
            openId={openId}
            onToggle={(oid) => setOpenId((cur) => (cur === oid ? null : oid))}
          />
        ))}
      </div>
      <p className="co-more">
        <a href="#/companies">募集が載っていない会社も見る →</a>
      </p>
    </>
  );
}

function CompanyBox({ company, list, role, lastRun, openId, onToggle }: {
  company: CompanyResult;
  list: Opening[];
  role: Role | "all";
  lastRun?: string;
  openId: string | null;
  onToggle: (id: string) => void;
}) {
  const auth = useAuth();
  const favKey = companyFavKey(company.id);
  const fav = auth.favorites.has(favKey);
  const newCount = list.filter((o) => isNewOpening(o.firstSeen, lastRun)).length;
  const k = company.conditions;
  const facts = [k?.salary != null ? `初任給 ${yen(k.salary)}` : "", k?.holidays != null ? `年間休日 ${k.holidays}日` : ""].filter(Boolean);

  return (
    <section className="co-box">
      <header className="co-head">
        <CompanyLogo company={company} size={44} href={company.site ?? company.url} />
        <div className="co-head__body">
          <p className="co-head__name">{company.name}</p>
          <p className="co-head__tags">{[...(company.locations ?? []).slice(0, 3), ...company.tags].join(" ・ ")}</p>
          <p className="co-head__counts">
            <span className="co-count">募集 {list.length}件</span>
            {newCount > 0 && <span className="badge badge--new">NEW {newCount}</span>}
            {facts.length > 0 && <span className="co-facts">{facts.join(" ・ ")}</span>}
          </p>
        </div>
        <button
          className={`fav ${fav ? "is-on" : ""}`}
          aria-pressed={fav}
          aria-label="会社をお気に入りに入れる"
          title={fav ? "お気に入りから外す" : auth.session ? "会社をお気に入りに追加" : "ログインするとお気に入りに追加できます"}
          onClick={() => auth.toggleFavorite(favKey, { title: company.name, company: company.name })}
        >
          <Icon name="star" size={17} />
        </button>
      </header>

      <ul className="co-list">
        {list.map((o) => {
          const isOpen = openId === o.id;
          const w = nextWhen(o);
          const closed = closedDate(o);
          const isNew = isNewOpening(o.firstSeen, lastRun);
          const [, m, d] = w ? w.date.split("-").map(Number) : [];
          return (
            <li key={o.id} className={`co-row ${isOpen ? "is-open" : ""}`}>
              <button className="co-row__btn" aria-expanded={isOpen} onClick={() => onToggle(o.id)}>
                <span className="co-row__main">
                  <span className={`badge badge--type-${o.type}`}>{TYPE_LABEL[o.type]}</span>
                  {isNew && <span className="badge badge--new">NEW</span>}
                  <span className="co-row__title">{o.title}</span>
                </span>
                <span className="co-row__when">
                  {w ? (
                    <>
                      <span className="co-row__date" title={w.kind === "deadline" ? "締切" : "受付開始"}>
                        {w.kind === "start" && <small>開始</small>}
                        {m}/{d}
                      </span>
                      <span className={`countdown ${w.kind === "deadline" ? (w.days <= 3 ? "is-hot" : w.days <= 7 ? "is-warm" : "") : ""}`}>
                        {w.kind === "deadline" ? (w.days === 0 ? "今日まで" : `あと${w.days}日`) : `${w.days}日後`}
                      </span>
                    </>
                  ) : closed ? (
                    <span className="co-row__none">締切済み {Number(closed.slice(5, 7))}/{Number(closed.slice(8, 10))}</span>
                  ) : (
                    <span className="co-row__none">日程未定</span>
                  )}
                </span>
                <span className="co-row__chev" aria-hidden>›</span>
              </button>
              {isOpen && (
                <div className="co-row__detail">
                  <OpeningDetail o={o} company={company} role={role} lastRun={lastRun} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <footer className="co-foot">
        <CompanyLinks labeled links={company.links} />
        <GameStrip companyId={company.id} />
      </footer>
    </section>
  );
}
