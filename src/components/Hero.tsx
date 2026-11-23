import { formatDateTime } from "../lib/util.ts";
import { KIcon, Vfx } from "./Icons.tsx";

export function Hero({ stats, updatedAt }: {
  stats: { companies: number; open: number; soon: number; fresh: number };
  updatedAt: string | null;
}) {
  return (
    <section className="hero">
      <div className="hero__fx" aria-hidden>
        <Vfx name="magic_circle" color="var(--c-accent)" className="hero__circle" />
        <Vfx name="energy_ring" color="var(--c-effect)" className="hero__ring" />
        <Vfx name="streak" color="var(--c-programmer)" className="hero__streak hero__streak--1" />
        <Vfx name="streak" color="var(--c-planner)" className="hero__streak hero__streak--2" />
      </div>
      <div className="hero__body">
        <p className="hero__kicker">
          <KIcon name="trophy" size={14} /> ゲーム業界を目指す人のための就活ボード
        </p>
        <h1 className="hero__title">
          インターンと新卒採用を、
          <br />
          <span className="grad">ひと目で。</span>
        </h1>
        <p className="hero__lead">
          ゲーム会社の採用ページを AI が毎日確認し、プログラマー・プランナー・エフェクトデザイナー向けの募集を一覧にまとめます。
        </p>
        <div className="stats">
          <Stat value={stats.open} label="募集中" icon="checkmark" tone="ok" />
          <Stat value={stats.soon} label="7日以内に締切" icon="warning" tone="warn" />
          <Stat value={stats.fresh} label="今週の新着" icon="star" tone="accent" />
          <Stat value={stats.companies} label="監視中の会社" icon="home" tone="muted" />
        </div>
        <p className="hero__updated">
          <span className="pulse" /> 最終更新 {formatDateTime(updatedAt)}
        </p>
      </div>
    </section>
  );
}

function Stat({ value, label, icon, tone }: { value: number; label: string; icon: string; tone: string }) {
  return (
    <div className={`stat stat--${tone}`}>
      <KIcon name={icon} size={18} className="stat__icon" />
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}
