import { formatDateTime } from "../lib/util.ts";
import { Icon, type IconName } from "./Icon.tsx";

/** ページ上部の見出しと数字のまとめ */
export function Hero({ stats, updatedAt, targetYear }: {
  stats: { companies: number; open: number; soon: number; fresh: number };
  updatedAt: string | null;
  targetYear: number | null;
}) {
  return (
    <section className="summary">
      <div>
        <h1 className="summary__title">
          インターン・新卒採用
          {targetYear && <small>{String(targetYear).slice(2)}卒向け</small>}
        </h1>
        <p className="summary__lead">ゲーム会社の公式採用ページから、プログラマー・プランナー・エフェクトデザイナー向けの募集をまとめています。</p>
        <p className="summary__updated">
          <Icon name="clock" size={13} /> 最終更新 {formatDateTime(updatedAt)}
        </p>
      </div>
      <div className="stats">
        <Stat value={stats.open} label="募集中" icon="check" tone="ok" />
        <Stat value={stats.soon} label="7日以内に締切" icon="alert" tone="warn" />
        <Stat value={stats.fresh} label="今週の新着" icon="star" tone="new" />
        <Stat value={stats.companies} label="掲載中の会社" icon="building" tone="" />
      </div>
    </section>
  );
}

function Stat({ value, label, icon, tone }: { value: number; label: string; icon: IconName; tone: string }) {
  return (
    <div className={`stat ${tone ? `stat--${tone}` : ""}`}>
      <span className="stat__value">{value}</span>
      <span className="stat__label">
        <Icon name={icon} size={12} /> {label}
      </span>
    </div>
  );
}
