import type { FlowKind, FlowStep, Role } from "../types.ts";
import { ROLE_LABEL } from "../types.ts";
import { Icon, type IconName } from "./Icon.tsx";

const FLOW_ICON: Record<FlowKind, IconName> = {
  entry: "send",
  briefing: "monitor",
  es: "doc",
  portfolio: "image",
  assignment: "code",
  test: "edit",
  groupwork: "users",
  interview: "chat",
  final: "user",
  offer: "trophy",
  other: "info",
};

/**
 * 募集の選考の流れをアイコンで並べる。
 * 職種を選んでいるときは、その職種に関係する段階だけにする（全職種共通の段階は残す）。
 */
export function FlowSteps({ flow, role }: { flow?: FlowStep[]; role: Role | "all" }) {
  if (!flow?.length) return null;
  const steps = role === "all" ? flow : flow.filter((s) => !s.roles?.length || s.roles.includes(role));
  if (!steps.length) return null;
  const roleOnly = role !== "all" && flow.some((s) => s.roles?.length);

  return (
    <div className="flow-mini">
      <p className="flow-mini__head">
        選考の流れ
        {roleOnly && <span className="flow-mini__role">{ROLE_LABEL[role]}の場合</span>}
      </p>
      <ol className="flow-mini__list">
        {steps.map((s, i) => [
          i > 0 && (
            <li key={`a${i}`} className="flow-mini__arrow" aria-hidden>
              ›
            </li>
          ),
          <li key={i} className={`flow-mini__step flow-mini__step--${s.kind}`} title={s.roles?.length ? `${s.label}（${s.roles.map((r) => ROLE_LABEL[r]).join("・")}）` : s.label}>
            <span className="flow-mini__icon">
              <Icon name={FLOW_ICON[s.kind]} size={15} />
            </span>
            <span className="flow-mini__label">{s.label}</span>
            {role === "all" && s.roles?.length ? <span className="flow-mini__only">{s.roles.map((r) => ROLE_LABEL[r].slice(0, 2)).join("・")}</span> : null}
          </li>,
        ])}
      </ol>
    </div>
  );
}
