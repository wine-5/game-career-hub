// 募集の「次に来る日付」と、日付で並べるためのキー
import type { Opening } from "../types.ts";
import { daysUntil, isNewOpening } from "./util.ts";

export interface When {
  kind: "deadline" | "start";
  date: string;
  /** 今日からの日数（0 は今日） */
  days: number;
}

/** 次に来る日付。締切が今日以降ならそれ。無ければ受付開始が明日以降ならそれ。どちらも無ければ null */
export function nextWhen(o: Opening): When | null {
  const d = daysUntil(o.deadline);
  if (d !== null && d >= 0) return { kind: "deadline", date: o.deadline, days: d };
  const s = daysUntil(o.applyStart);
  if (s !== null && s >= 1) return { kind: "start", date: o.applyStart, days: s };
  return null;
}

/** 並べるときのキー（小さいほど前）: 日付あり→その日数 / NEW→50000 / その他→60000 / 締切済み→100000+過ぎた日数 */
export function dateSortKey(o: Opening, lastRun?: string): number {
  const w = nextWhen(o);
  if (w) return w.days;
  const d = daysUntil(o.deadline);
  if (d !== null && d < 0) return 100000 + -d;
  return isNewOpening(o.firstSeen, lastRun) ? 50000 : 60000;
}
