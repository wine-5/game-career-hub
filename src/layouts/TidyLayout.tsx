import { useState, type CSSProperties } from "react";
import type { CompanyResult, Opening, Role } from "../types.ts";
import { DESIGN_LABEL, ROLE_LABEL, TYPE_LABEL } from "../types.ts";
import { formatDate, isNewOpening, ROLE_COLOR, statusOf, STATUS_LABEL } from "../lib/util.ts";
import { closedDate, nextWhen } from "../lib/when.ts";
import { useAuth } from "../lib/auth.tsx";
import { Icon } from "../components/Icon.tsx";
import { CompanyLogo } from "../components/CompanyLogo.tsx";
import { CompanyLinks } from "../components/CompanyLinks.tsx";
import { GameStrip } from "../components/GameStrip.tsx";
import { FlowSteps } from "../components/FlowSteps.tsx";
import { SourceLink } from "../components/SourceLink.tsx";
import { ConditionChips } from "../components/ConditionChips.tsx";
import { TechChips } from "../components/TechChips.tsx";
import { TrackButton } from "../components/TrackButton.tsx";
import { primaryLink } from "../components/OpeningCard.tsx";
import type { LayoutProps } from "./types.ts";
import "./tidy.css";

/** すっきりカード: 要点だけ見せて、詳しくは開いて見る */
export function TidyLayout({ shown, companies, role, lastRun }: LayoutProps) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="tidy-grid">
      {shown.map((o) => {
        const c = companies.get(o.companyId);
        return c ? <TidyCard key={o.id} o={o} company={c} role={role} lastRun={lastRun} isOpen={open.has(o.id)} onToggle={() => toggle(o.id)} /> : null;
      })}
    </div>
  );
}

function TidyCard({ o, company, role, lastRun, isOpen, onToggle }: {
  o: Opening;
  company: CompanyResult;
  role: Role | "all";
  lastRun?: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const auth = useAuth();
  const fav = auth.favorites.has(o.id);
  const status = statusOf(o);
  const isNew = isNewOpening(o.firstSeen, lastRun);
  const link = primaryLink(o, company);
  const w = nextWhen(o);
  const closed = closedDate(o);
  const hasDate = Boolean(o.deadline || o.applyStart);
  const panelId = `tidy-more-${o.id}`;

  return (
    <article className={`tidy-card tidy-card--${status}`}>
      <header className="tidy-head">
        <CompanyLogo company={company} size={36} href={company.site ?? company.url} />
        <div className="tidy-head__body">
          <p className="tidy-head__name">{company.name}</p>
          <p className="tidy-head__tags">{[...(company.locations ?? []).slice(0, 2), ...company.tags.slice(0, 2)].join(" ・ ")}</p>
        </div>
        <button
          className={`fav ${fav ? "is-on" : ""}`}
          aria-pressed={fav}
          aria-label="お気に入り"
          title={fav ? "お気に入りから外す" : auth.session ? "お気に入りに追加" : "ログインするとお気に入りに追加できます"}
          onClick={() => auth.toggleFavorite(o.id, { title: o.title, company: company.name })}
        >
          <Icon name="star" size={17} />
        </button>
      </header>

      <div className="card__badges">
        <span className={`badge badge--type-${o.type}`}>{TYPE_LABEL[o.type]}</span>
        {hasDate && <span className={`badge badge--status-${status}`}>{STATUS_LABEL[status]}</span>}
        {isNew && <span className="badge badge--new" title={`${formatDate(o.firstSeen)}の更新で新しく見つけた募集`}>NEW</span>}
      </div>

      <h3 className="tidy-title">{o.title}</h3>

      <p className="tidy-when">
        {w ? (
          <>
            <span>{w.kind === "deadline" ? "締切" : "受付開始"} {formatDate(w.date)}</span>
            <span className={`countdown ${w.kind === "deadline" ? (w.days <= 3 ? "is-hot" : w.days <= 7 ? "is-warm" : "") : ""}`}>
              {w.kind === "deadline" ? (w.days === 0 ? "今日まで" : `あと${w.days}日`) : `${w.days}日後`}
            </span>
          </>
        ) : closed ? (
          <span>締切済み {formatDate(closed)}</span>
        ) : (
          <span className="tidy-when__none">日程は公式ページで</span>
        )}
        {o.location && <span className="tidy-when__loc">{o.location}</span>}
      </p>

      {o.summary && <p className="tidy-summary">{o.summary}</p>}

      <div className="tidy-foot">
        <a className="btn btn--primary" href={link.url} target="_blank" rel="noopener noreferrer">
          {link.label}
          <Icon name="external" size={14} />
        </a>
        <button className="btn tidy-more-btn" aria-expanded={isOpen} aria-controls={panelId} onClick={onToggle}>
          詳しく {isOpen ? "▴" : "▾"}
        </button>
      </div>

      {isOpen && (
        <div className="tidy-more" id={panelId}>
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
          <SourceLink url={o.sourceUrl} />
          {o.type === "newgrad" && <ConditionChips k={company.conditions} />}
          {(role === "programmer" || (role === "all" && o.roles.includes("programmer"))) && <TechChips companyId={company.id} />}
          <FlowSteps flow={o.flow} role={role} sourceUrl={o.flowSourceUrl ?? o.sourceUrl} note={o.flowNote} />
          <GameStrip companyId={company.id} />
          <div className="tidy-more__links">
            <CompanyLinks labeled links={company.links} hide={link.hide ? [link.hide] : []} />
            <TrackButton companyId={company.id} companyName={company.name} kind={o.type === "internship" ? "internship" : "newgrad"} title={o.title} />
          </div>
        </div>
      )}
    </article>
  );
}
