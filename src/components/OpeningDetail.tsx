import type { CSSProperties } from "react";
import type { CompanyResult, Opening, Role } from "../types.ts";
import { DESIGN_LABEL, FORMAT_LABEL, ROLE_LABEL, TYPE_LABEL } from "../types.ts";
import { daysUntil, formatDate, isNewOpening, ROLE_COLOR } from "../lib/util.ts";
import { useAuth } from "../lib/auth.tsx";
import { Icon } from "./Icon.tsx";
import { CompanyLogo } from "./CompanyLogo.tsx";
import { CompanyLinks } from "./CompanyLinks.tsx";
import { FlowSteps } from "./FlowSteps.tsx";
import { SourceLink } from "./SourceLink.tsx";
import { ConditionChips } from "./ConditionChips.tsx";
import { TechChips } from "./TechChips.tsx";
import { TrackButton } from "./TrackButton.tsx";
import { companyFavKey } from "./CompanyGrid.tsx";
import { primaryLink } from "./OpeningCard.tsx";

/** 募集 1 件の詳細（会社ごと・日付順・一覧＋詳細の各表示で使う） */
export function OpeningDetail({ o, company, role, lastRun, showCompany = false }: {
  o: Opening;
  company: CompanyResult;
  role: Role | "all";
  lastRun?: string;
  showCompany?: boolean;
}) {
  const auth = useAuth();
  const link = primaryLink(o, company);
  const fav = auth.favorites.has(o.id);
  const companyFav = auth.favorites.has(companyFavKey(company.id));
  const isNew = isNewOpening(o.firstSeen, lastRun);

  // 分かっている日程だけを並べる（空欄の「—」を並べない）
  const rows: { label: string; value: React.ReactNode }[] = [];
  if (o.deadline) {
    const left = daysUntil(o.deadline);
    rows.push({
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
  }
  if (o.applyStart) rows.push({ label: "受付開始", value: formatDate(o.applyStart) });
  if (o.period) rows.push({ label: "期間", value: o.period });
  if (o.format !== "unknown") rows.push({ label: "形式", value: FORMAT_LABEL[o.format] });
  if (o.location) rows.push({ label: "場所", value: o.location });

  return (
    <div className="odetail">
      {showCompany && (
        <header className="odetail__company">
          <CompanyLogo company={company} size={40} href={company.site ?? company.url} />
          <div className="odetail__company-body">
            <p className="odetail__company-name">{company.name}</p>
            <p className="odetail__company-meta">{[...(company.locations ?? []).slice(0, 3), ...company.tags].join(" ・ ")}</p>
          </div>
          <button
            className={`fav ${companyFav ? "is-on" : ""}`}
            aria-pressed={companyFav}
            aria-label="会社をお気に入りに入れる"
            title={companyFav ? "お気に入りから外す" : auth.session ? "会社をお気に入りに追加" : "ログインするとお気に入りに追加できます"}
            onClick={() => auth.toggleFavorite(companyFavKey(company.id), { title: company.name, company: company.name })}
          >
            <Icon name="star" size={17} />
          </button>
        </header>
      )}

      <div className="card__badges">
        <span className={`badge badge--type-${o.type}`}>{TYPE_LABEL[o.type]}</span>
        {isNew && <span className="badge badge--new" title={`${formatDate(o.firstSeen)}の更新で新しく見つけた募集`}>NEW</span>}
      </div>

      <h3 className="odetail__title">{o.title}</h3>
      {o.summary && <p className="card__summary">{o.summary}</p>}
      <SourceLink url={o.sourceUrl} />

      {rows.length > 0 ? (
        <dl className="odetail__dates">
          {rows.map((r) => (
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd className={r.label === "締切" ? "card__deadline" : ""}>{r.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="card__nodate">
          <Icon name="clock" size={13} /> 日程は公式ページで確認してください
        </p>
      )}

      <ul className="card__roles" aria-label="職種">
        {o.roles.map((r) => (
          <li key={r} className="role-pill" style={{ "--role": ROLE_COLOR[r] } as CSSProperties}>
            {ROLE_LABEL[r]}
          </li>
        ))}
        {o.designKinds?.map((d) => (
          <li key={d} className="design-pill">{DESIGN_LABEL[d]}</li>
        ))}
      </ul>

      {o.type === "newgrad" && <ConditionChips k={company.conditions} />}
      {(role === "programmer" || (role === "all" && o.roles.includes("programmer"))) && <TechChips companyId={company.id} />}
      <FlowSteps flow={o.flow} role={role} sourceUrl={o.flowSourceUrl ?? o.sourceUrl} note={o.flowNote} />

      <div className="odetail__actions">
        <a className="btn btn--primary" href={link.url} target="_blank" rel="noopener noreferrer">
          {link.label}
          <Icon name="external" size={14} />
        </a>
        <CompanyLinks labeled links={company.links} hide={link.hide ? [link.hide] : []} />
        <button
          className={`fav ${fav ? "is-on" : ""}`}
          aria-pressed={fav}
          title={fav ? "お気に入りから外す" : auth.session ? "お気に入りに追加" : "ログインするとお気に入りに追加できます"}
          aria-label="お気に入り"
          onClick={() => auth.toggleFavorite(o.id, { title: o.title, company: company.name })}
        >
          <Icon name="star" size={17} />
        </button>
        <TrackButton companyId={company.id} companyName={company.name} kind={o.type === "internship" ? "internship" : "newgrad"} title={o.title} />
      </div>
    </div>
  );
}
