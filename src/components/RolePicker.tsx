import type { Role } from "../types.ts";
import { ROLE_LABEL } from "../types.ts";
import { ROLE_COLOR } from "../lib/util.ts";
import { RoleIcon, Vfx } from "./Icons.tsx";

const CARDS: { role: Role; vfx: string; desc: string }[] = [
  { role: "programmer", vfx: "orb", desc: "クライアント / サーバー / エンジン" },
  { role: "planner", vfx: "energy_ring", desc: "ゲームデザイン / レベル / シナリオ" },
  { role: "effect", vfx: "starburst", desc: "VFX / パーティクル / シェーダー" },
  { role: "artist", vfx: "slash_arc", desc: "2D・3D / モーション / UI" },
];

export function RolePicker({ value, counts, onChange }: {
  value: Role | "all";
  counts: Record<Role | "all", number>;
  onChange: (r: Role | "all") => void;
}) {
  return (
    <div className="roles" role="tablist" aria-label="職種で絞り込む">
      <button
        role="tab"
        aria-selected={value === "all"}
        className={`role-card role-card--all ${value === "all" ? "is-active" : ""}`}
        onClick={() => onChange("all")}
      >
        <span className="role-card__count">{counts.all}</span>
        <span className="role-card__name">すべて</span>
        <span className="role-card__desc">全職種の募集</span>
      </button>
      {CARDS.map((c) => (
        <button
          key={c.role}
          role="tab"
          aria-selected={value === c.role}
          className={`role-card ${value === c.role ? "is-active" : ""}`}
          style={{ "--role": ROLE_COLOR[c.role] } as React.CSSProperties}
          onClick={() => onChange(value === c.role ? "all" : c.role)}
        >
          <Vfx name={c.vfx} color={ROLE_COLOR[c.role]} className="role-card__fx" />
          <span className="role-card__icon">
            <RoleIcon role={c.role} size={26} />
          </span>
          <span className="role-card__count">{counts[c.role]}</span>
          <span className="role-card__name">{ROLE_LABEL[c.role]}</span>
          <span className="role-card__desc">{c.desc}</span>
        </button>
      ))}
    </div>
  );
}
