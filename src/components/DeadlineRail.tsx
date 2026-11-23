import type { CompanyResult, Opening } from "../types.ts";
import { daysUntil, formatDate } from "../lib/util.ts";
import { Icon } from "./Icon.tsx";

/** 30 日以内の締切を時系列で並べる */
export function DeadlineRail({ items, companies }: {
  items: Opening[];
  companies: Map<string, CompanyResult>;
}) {
  const upcoming = items
    .map((o) => ({ o, d: daysUntil(o.deadline) }))
    .filter((x): x is { o: Opening; d: number } => x.d !== null && x.d >= 0 && x.d <= 30)
    .sort((a, b) => a.d - b.d)
    .slice(0, 12);

  return (
    <aside className="rail">
      <h2 className="rail__title">
        <Icon name="clock" size={16} /> 締切が近い募集
        <small>30日以内</small>
      </h2>
      {upcoming.length === 0 ? (
        <p className="rail__empty">30日以内に締切の募集はありません。</p>
      ) : (
        <ol className="rail__list">
          {upcoming.map(({ o, d }) => (
            <li key={o.id} className={`rail__item ${d <= 3 ? "is-hot" : d <= 7 ? "is-warm" : ""}`}>
              <div className="rail__date">
                <b>{formatDate(o.deadline)}</b>
                <span>{d === 0 ? "今日まで" : `あと${d}日`}</span>
              </div>
              <a className="rail__body" href={o.sourceUrl} target="_blank" rel="noopener noreferrer">
                <span className="rail__company">{companies.get(o.companyId)?.name}</span>
                <span className="rail__name">{o.title}</span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
