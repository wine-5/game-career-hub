import type { CSSProperties } from "react";
import type { DesignKind, Role } from "../types.ts";
import { DESIGN_KINDS, DESIGN_LABEL, ROLE_LABEL } from "../types.ts";
import { ROLE_COLOR } from "../lib/util.ts";

const ORDER: Role[] = ["programmer", "planner", "effect", "artist"];

/** 職種の切り替え（もう一度押すと「すべて」に戻る） */
export function RolePicker({ value, counts, onChange }: {
  value: Role | "all";
  counts: Record<Role | "all", number>;
  onChange: (r: Role | "all") => void;
}) {
  return (
    <div className="roles" role="tablist" aria-label="職種で絞り込む">
      <button role="tab" aria-selected={value === "all"} className={`role-chip ${value === "all" ? "is-active" : ""}`} onClick={() => onChange("all")}>
        すべての職種 <span className="role-chip__count">{counts.all}</span>
      </button>
      {ORDER.map((r) => (
        <button
          key={r}
          role="tab"
          aria-selected={value === r}
          className={`role-chip ${value === r ? "is-active" : ""}`}
          style={{ "--role": ROLE_COLOR[r] } as CSSProperties}
          onClick={() => onChange(value === r ? "all" : r)}
        >
          <span className="role-chip__dot" />
          {ROLE_LABEL[r]}
          <span className="role-chip__count">{counts[r]}</span>
        </button>
      ))}
    </div>
  );
}

/** デザイナーを選んでいる時の細かい区分（3D・2D・UI など）。区分の書かれていない募集は「すべて」にだけ出る */
export function DesignPicker({ value, counts, onChange }: {
  value: DesignKind | "all";
  counts: Record<DesignKind | "all", number>;
  onChange: (d: DesignKind | "all") => void;
}) {
  return (
    <div className="design-kinds" role="tablist" aria-label="デザイナーの区分で絞り込む">
      <button role="tab" aria-selected={value === "all"} className={`design-chip ${value === "all" ? "is-active" : ""}`} onClick={() => onChange("all")}>
        すべて <span className="role-chip__count">{counts.all}</span>
      </button>
      {DESIGN_KINDS.filter((d) => counts[d] > 0 || value === d).map((d) => (
        <button
          key={d}
          role="tab"
          aria-selected={value === d}
          className={`design-chip ${value === d ? "is-active" : ""}`}
          onClick={() => onChange(value === d ? "all" : d)}
        >
          {DESIGN_LABEL[d]}
          <span className="role-chip__count">{counts[d]}</span>
        </button>
      ))}
    </div>
  );
}
