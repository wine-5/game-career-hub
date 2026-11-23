import type { CSSProperties } from "react";
import type { CompanyResult, Opening } from "../types.ts";
import { FORMAT_LABEL, ROLE_LABEL, TYPE_LABEL } from "../types.ts";
import { daysUntil, formatDate, ROLE_COLOR, statusOf, STATUS_LABEL, todayJst } from "../lib/util.ts";
import { useAuth } from "../lib/auth.tsx";
import { Icon } from "./Icon.tsx";
import { CompanyLogo } from "./CompanyLogo.tsx";
import { CompanyLinks } from "./CompanyLinks.tsx";

/** 募集の種類に合わせた飛び先（新卒なら新卒採用ページ、インターンならインターンページ） */
function primaryLink(o: Opening, c: CompanyResult) {
  if (o.type === "newgrad") return { url: c.links?.newgrad ?? o.sourceUrl, label: "新卒採用ページへ", hide: "newgrad" as const };
  if (o.type === "internship") return { url: c.links?.internship ?? o.sourceUrl, label: "インターンページへ", hide: "internship" as const };
  return { url: o.sourceUrl, label: "詳細ページへ", hide: undefined };
}

export function OpeningCard({ o, company }: { o: Opening; company: CompanyResult }) {
  const auth = useAuth();
  const fav = auth.favorites.has(o.id);
  const status = statusOf(o);
  const left = daysUntil(o.deadline);
  const isNew = (daysUntil(o.firstSeen) ?? -99) >= -7 && o.firstSeen <= todayJst();
  const link = primaryLink(o, company);

  return (
    <article className={`card card--${status}`}>
      <header className="card__head">
        <CompanyLogo company={company} size={40} />
        <div className="card__company">
          <p className="card__company-name">{company.name}</p>
          <p className="card__tags">{company.tags.join(" ・ ")}</p>
        </div>
        <button
          className={`fav ${fav ? "is-on" : ""}`}
          aria-pressed={fav}
          title={fav ? "お気に入りから外す" : auth.session ? "お気に入りに追加" : "ログインするとお気に入りに追加できます"}
          aria-label="お気に入り"
          onClick={() => auth.toggleFavorite(o.id, { title: o.title, company: company.name })}
        >
          <Icon name="star" size={17} />
        </button>
      </header>

      <div className="card__badges">
        <span className={`badge badge--type-${o.type}`}>{TYPE_LABEL[o.type]}</span>
        <span className={`badge badge--status-${status}`}>{STATUS_LABEL[status]}</span>
        {isNew && <span className="badge badge--new">NEW</span>}
      </div>

      <h3 className="card__title">{o.title}</h3>
      {o.summary && <p className="card__summary">{o.summary}</p>}

      <ul className="card__roles" aria-label="職種">
        {o.roles.map((r) => (
          <li key={r} className="role-pill" style={{ "--role": ROLE_COLOR[r] } as CSSProperties}>
            {ROLE_LABEL[r]}
          </li>
        ))}
      </ul>

      <dl className="card__meta">
        <div>
          <dt>締切</dt>
          <dd className="card__deadline">
            {formatDate(o.deadline)}
            {left !== null && left >= 0 && (
              <span className={`countdown ${left <= 3 ? "is-hot" : left <= 7 ? "is-warm" : ""}`}>
                {left === 0 ? "今日まで" : `あと${left}日`}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>受付開始</dt>
          <dd>{formatDate(o.applyStart)}</dd>
        </div>
        {o.period && (
          <div className="wide">
            <dt>期間</dt>
            <dd>{o.period}</dd>
          </div>
        )}
        <div>
          <dt>形式</dt>
          <dd>{FORMAT_LABEL[o.format]}</dd>
        </div>
        <div>
          <dt>場所</dt>
          <dd>{o.location || "—"}</dd>
        </div>
      </dl>

      <footer className="card__foot">
        <a className="btn btn--primary" href={link.url} target="_blank" rel="noopener noreferrer">
          {link.label}
          <Icon name="external" size={14} />
        </a>
        <CompanyLinks links={company.links} hide={link.hide ? [link.hide] : []} />
      </footer>
    </article>
  );
}
