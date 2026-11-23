import type { Conditions } from "../types.ts";
import { salaryNotes, yen } from "../lib/conditions.ts";
import { Icon } from "./Icon.tsx";

/** 初任給・年間休日・平均残業の小さな札。押すと数字が書かれていたページ（出典）を開く */
export function ConditionChips({ k }: { k?: Conditions }) {
  if (!k || (k.salary == null && k.holidays == null && k.overtime == null && !k.salaryLabel)) return null;
  const open = (label: string, value: string, cls: string, title?: string) => (
    <a className={`cond cond--${cls}`} href={k.sourceUrl} target="_blank" rel="noopener noreferrer" title={`${title ?? value} — 出典のページを開く`}>
      <span className="cond__label">{label}</span>
      <b>{value}</b>
    </a>
  );
  const notes = salaryNotes(k.salaryLabel);
  return (
    <div className="conds">
      {k.salary != null && open("初任給", yen(k.salary), "salary", k.salaryLabel)}
      {/* 数字だけでは誤解されやすい点（固定残業代込み・前の年の額など）は必ず見せる */}
      {k.salary != null && notes.map((n) => (
        <span key={n} className="cond__note">{n}</span>
      ))}
      {k.salary == null && k.salaryLabel && open("初任給", k.salaryLabel.slice(0, 16), "salary", k.salaryLabel)}
      {k.holidays != null && open("年間休日", `${k.holidays}日`, "holidays")}
      {k.overtime != null && open("平均残業", `月${k.overtime}h`, "overtime")}
      <a className="cond__src" href={k.sourceUrl} target="_blank" rel="noopener noreferrer" title={k.sourceUrl} aria-label="待遇の出典">
        <Icon name="doc" size={11} />
        出典
      </a>
    </div>
  );
}
