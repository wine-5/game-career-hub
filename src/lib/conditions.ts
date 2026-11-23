// 待遇（初任給・年間休日・平均残業）での絞り込みと並べ替え。
// 書かれていない会社は、その項目で絞る・並べるときは対象外にする。
import type { Conditions } from "../types.ts";

export interface ConditionFilter {
  /** 初任給（円）の下限。0 は指定なし */
  salaryMin: number;
  /** 年間休日の下限。0 は指定なし */
  holidaysMin: number;
  /** 月平均残業の上限。0 は指定なし */
  overtimeMax: number;
}

export const NO_CONDITION: ConditionFilter = { salaryMin: 0, holidaysMin: 0, overtimeMax: 0 };

export const SALARY_STEPS = [220000, 250000, 280000, 300000, 350000];
export const HOLIDAY_STEPS = [115, 120, 125, 130];
export const OVERTIME_STEPS = [10, 20, 30];

export const yen = (n: number) => `${(n / 10000).toFixed(1).replace(/\.0$/, "")}万円`;

/** 初任給の表記から、数字だけでは分からない但し書きを拾う（固定残業代込み・前の年の額など） */
export function salaryNotes(label?: string): string[] {
  if (!label) return [];
  const notes: string[] = [];
  const ot = label.match(/(\d+)\s*時間分/);
  if (/固定残業|みなし|残業手当相当|残業代.*含/.test(label)) notes.push(ot ? `固定残業${ot[1]}h込み` : "固定残業代込み");
  const yr = label.match(/(2\d)卒|20(2\d)年(?:度|卒)/);
  if (yr) notes.push(`${yr[1] ?? yr[2]}卒の額`);
  if (/年俸/.test(label)) notes.push("年俸制");
  if (/〜|～|以上/.test(label)) notes.push("下限の額");
  return notes;
}

/** 条件に合うか（指定した項目が書かれていない会社は外す） */
export function matchConditions(k: Conditions | undefined, f: ConditionFilter): boolean {
  if (f.salaryMin && !(k?.salary && k.salary >= f.salaryMin)) return false;
  if (f.holidaysMin && !(k?.holidays && k.holidays >= f.holidaysMin)) return false;
  if (f.overtimeMax && !(k?.overtime != null && k.overtime <= f.overtimeMax)) return false;
  return true;
}

export type ConditionSort = "salary" | "holidays" | "overtime";

export const CONDITION_SORT_LABEL: Record<ConditionSort, string> = {
  salary: "初任給が高い順",
  holidays: "年間休日が多い順",
  overtime: "平均残業が少ない順",
};

/** 並べ替えの値（大きいほど前）。書かれていなければ null（対象外） */
export function conditionKey(k: Conditions | undefined, s: ConditionSort): number | null {
  if (s === "salary") return k?.salary ?? null;
  if (s === "holidays") return k?.holidays ?? null;
  return k?.overtime != null ? -k.overtime : null;
}

export const isConditionSort = (s: string): s is ConditionSort => s === "salary" || s === "holidays" || s === "overtime";
