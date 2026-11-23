import type { CSSProperties } from "react";
import type { CompanyResult, Opening, Role } from "../types.ts";
import { FORMAT_LABEL, ROLE_LABEL, TYPE_LABEL } from "../types.ts";
import { daysUntil, formatDate, ROLE_COLOR, statusOf, STATUS_LABEL, todayJst } from "../lib/util.ts";
import { useAuth } from "../lib/auth.tsx";
import { Icon } from "./Icon.tsx";
import { CompanyLogo } from "./CompanyLogo.tsx";
import { CompanyLinks } from "./CompanyLinks.tsx";
import { GameStrip } from "./GameStrip.tsx";
import { FlowSteps } from "./FlowSteps.tsx";
import { SourceLink } from "./SourceLink.tsx";
import { TrackButton } from "./TrackButton.tsx";

/** 募集の種類に合わせた飛び先（新卒なら新卒採用ページ、インターンならインターンページ） */
function primaryLink(o: Opening, c: CompanyResult) {
  if (o.type === "newgrad") return { url: c.links?.newgrad ?? o.sourceUrl, label: "新卒採用ページへ", hide: "newgrad" as const };
  if (o.type === "internship") return { url: c.links?.internship ?? o.sourceUrl, label: "インターンページへ", hide: "internship" as const };
  return { url: o.sourceUrl, label: "詳細ページへ", hide: undefined };
}

export function OpeningCard({ o, company, role = "all" }: { o: Opening; company: CompanyResult; role?: Role | "all" }) {
  const auth = useAuth();
  const fav = auth.favorites.has(o.id);
  const status = statusOf(o);
  const left = daysUntil(o.deadline);
  const isNew = (daysUntil(o.firstSeen) ?? -99) >= -7 && o.firstSeen <= todayJst();
  const link = primaryLink(o, company);

  // 分かっている項目だけを並べる（空欄の「—」を並べない）
  const meta: { label: string; value: React.ReactNode; wide?: boolean }[] = [];
  if (o.deadline)
    meta.push({
      label: "締切",
      value: (
        <>
          {formatDate(o.deadline)}
          {left !== null && left >= 0 && (
            <span className={`countdown ${left <= 3 ? "is-hot" : left <= 7 ? "is-warm" : ""}`}>
              {left === 0 ? "今日まで" : `あと${left}日`}
            </span>
          )}
        </>
      ),
    });
  if (o.applyStart) meta.push({ label: "受付開始", value: formatDate(o.applyStart) });
  if (o.period) meta.push({ label: "期間", value: o.period, wide: true });
  if (o.format !== "unknown") meta.push({ label: "形式", value: FORMAT_LABEL[o.format] });
  if (o.location) meta.push({ label: "場所", value: o.location });

  return (
    <article className={`card card--${status}`}>
      <header className="card__head">
        <CompanyLogo company={company} size={40} href={company.site ?? company.url} />
        <div className="card__company">
          <p className="card__company-name">{company.name}</p>
          <p className="card__tags">
            {[...(company.locations ?? []).slice(0, 3), ...company.tags].join(" ・ ")}
          </p>
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
      <SourceLink url={o.sourceUrl} />

      <ul className="card__roles" aria-label="職種">
        {o.roles.map((r) => (
          <li key={r} className="role-pill" style={{ "--role": ROLE_COLOR[r] } as CSSProperties}>
            {ROLE_LABEL[r]}
          </li>
        ))}
      </ul>

      {meta.length > 0 ? (
        <dl className="card__meta">
          {meta.map((m) => (
            <div key={m.label} className={m.wide ? "wide" : ""}>
              <dt>{m.label}</dt>
              <dd className={m.label === "締切" ? "card__deadline" : ""}>{m.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="card__nodate">
          <Icon name="clock" size={13} /> 日程は公式ページで確認してください
        </p>
      )}

      <FlowSteps flow={o.flow} role={role} sourceUrl={o.flowSourceUrl ?? o.sourceUrl} note={o.flowNote} />

      <GameStrip companyId={company.id} />

      <footer className="card__foot">
        <a className="btn btn--primary" href={link.url} target="_blank" rel="noopener noreferrer">
          {link.label}
          <Icon name="external" size={14} />
        </a>
        <CompanyLinks links={company.links} hide={link.hide ? [link.hide] : []} />
        <TrackButton companyId={company.id} companyName={company.name} kind={o.type === "internship" ? "internship" : "newgrad"} title={o.title} />
      </footer>
    </article>
  );
}
