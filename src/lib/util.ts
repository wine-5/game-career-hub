import type { Opening, Role } from "../types.ts";

export const asset = (p: string) => `${import.meta.env.BASE_URL}assets/${p}`;

/** 日本時間の今日（YYYY-MM-DD） */
export function todayJst(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

/** 今日から指定日までの日数。日付が無ければ null */
export function daysUntil(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const a = Date.parse(todayJst() + "T00:00:00Z");
  const b = Date.parse(date + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

export type Status = "open" | "upcoming" | "closed" | "unknown";
export const STATUS_LABEL: Record<Status, string> = {
  open: "募集中",
  upcoming: "近日開始",
  closed: "締切済み",
  unknown: "日程要確認",
};

export function statusOf(o: Opening): Status {
  const d = daysUntil(o.deadline);
  if (d !== null && d < 0) return "closed";
  const s = daysUntil(o.applyStart);
  if (s !== null && s > 0) return "upcoming";
  if (d === null && s === null) return "unknown";
  return "open";
}

export function formatDate(date: string): string {
  if (!date) return "—";
  const [y, m, d] = date.split("-").map(Number);
  const w = "日月火水木金土"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}/${d}(${w})`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "未取得";
  const t = new Date(iso);
  return t.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export const ROLE_COLOR: Record<Role, string> = {
  programmer: "var(--c-programmer)",
  planner: "var(--c-planner)",
  effect: "var(--c-effect)",
  artist: "var(--c-artist)",
  other: "var(--c-other)",
};
