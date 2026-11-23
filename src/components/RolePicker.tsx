import type { CSSProperties } from "react";
import type { Role } from "../types.ts";
import { ROLE_LABEL } from "../types.ts";
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
