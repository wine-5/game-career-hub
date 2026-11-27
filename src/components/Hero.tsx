import { formatDateLong, formatDateTime } from "../lib/util.ts";
import { Icon, type IconName } from "./Icon.tsx";

/** ページ上部の見出しと数字のまとめ */
export function Hero({ stats, updatedAt, lastRun, targetYear, onlyNew, onToggleNew }: {
  stats: { companies: number; open: number; soon: number; fresh: number };
  updatedAt: string | null;
  lastRun?: string;
  targetYear: number | null;
  onlyNew: boolean;
  onToggleNew: () => void;
}) {
  return (
    <section className="summary">
      <div>
        <h1 className="summary__title">
          インターン・新卒採用
          {targetYear && <small>{String(targetYear).slice(2)}卒向け</small>}
        </h1>
        <p className="summary__lead">ゲーム会社の公式採用ページから、プログラマー・プランナー・デザイナー（3D・2D・UI・エフェクトなど）向けの募集をまとめています。</p>
        <p className="summary__updated">
          <Icon name="clock" size={13} /> 最終更新 <b>{formatDateLong(lastRun)}</b>
          <span className="summary__time">{formatDateTime(updatedAt)}</span>
        </p>
      </div>
      <div className="stats">
        <Stat value={stats.open} label="掲載中の募集" icon="check" tone="ok" />
        <Stat value={stats.soon} label="7日以内に締切" icon="alert" tone="warn" />
        {/* 押すと NEW だけを表示する */}
        <button className={`stat stat--new stat--button ${onlyNew ? "is-on" : ""}`} onClick={onToggleNew} aria-pressed={onlyNew} title="今回の更新で新しく見つかった募集だけを表示する">
          <span className="stat__value">{stats.fresh}</span>
          <span className="stat__label">
            <Icon name="star" size={12} /> 今回の更新の新着{onlyNew ? "（表示中）" : " ›"}
          </span>
        </button>
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
