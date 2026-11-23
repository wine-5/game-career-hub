import type { CSSProperties } from "react";
import type { CompanyResult, Opening } from "../types.ts";
import { FORMAT_LABEL, ROLE_LABEL, TYPE_LABEL } from "../types.ts";
import { daysUntil, formatDate, ROLE_COLOR, statusOf, STATUS_LABEL, todayJst } from "../lib/util.ts";
import { useAuth } from "../lib/auth.tsx";
import { KIcon, RoleIcon } from "./Icons.tsx";

export function OpeningCard({ o, company }: { o: Opening; company: CompanyResult }) {
  const auth = useAuth();
  const fav = auth.favorites.has(o.id);
  const status = statusOf(o);
  const left = daysUntil(o.deadline);
  const isNew = (daysUntil(o.firstSeen) ?? -99) >= -7 && o.firstSeen <= todayJst();
  const main = o.roles[0] ?? "other";

  return (
    <article className={`card card--${status}`} style={{ "--role": ROLE_COLOR[main] } as CSSProperties}>
      <div className="card__glow" aria-hidden />
      <header className="card__head">
        <div className="card__company">
          <span className="card__avatar">{company.name.slice(0, 1)}</span>
          <div>
            <p className="card__company-name">{company.name}</p>
            <p className="card__tags">{company.tags.join(" / ")}</p>
          </div>
        </div>
        <button
          className={`fav ${fav ? "is-on" : ""}`}
          aria-pressed={fav}
          title={fav ? "お気に入りから外す" : auth.session ? "お気に入りに追加" : "ログインするとお気に入りに追加できます"}
          onClick={() => auth.toggleFavorite(o.id, { title: o.title, company: company.name })}
        >
          <KIcon name="star" size={18} />
        </button>
      </header>

      <div className="card__badges">
        <span className={`badge badge--type-${o.type}`}>{TYPE_LABEL[o.type]}</span>
        <span className={`badge badge--status-${status}`}>{STATUS_LABEL[status]}</span>
        {isNew && <span className="badge badge--new">NEW</span>}
      </div>

      <h3 className="card__title">{o.title}</h3>
      {o.summary && <p className="card__summary">{o.summary}</p>}

      <ul className="card__roles">
        {o.roles.map((r) => (
          <li key={r} className="role-pill" style={{ "--role": ROLE_COLOR[r] } as CSSProperties}>
            <RoleIcon role={r} size={14} />
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
          <dt>対象</dt>
          <dd>{o.graduationYears.length ? o.graduationYears.map((y) => `${String(y).slice(2)}卒`).join("・") : "—"}</dd>
        </div>
        {o.location && (
          <div className="wide">
            <dt>場所</dt>
            <dd>{o.location}</dd>
          </div>
        )}
      </dl>

      <footer className="card__foot">
        <a className="btn btn--primary btn--block" href={o.sourceUrl} target="_blank" rel="noopener noreferrer">
          公式ページで確認
          <KIcon name="exitRight" size={14} />
        </a>
      </footer>
    </article>
  );
}
