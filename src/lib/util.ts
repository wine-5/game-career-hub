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

// ===== 地域（都道府県） =====

/** 選びやすいように先頭に並べる主な地域 */
export const MAIN_PREFS = ["北海道", "東京", "大阪", "京都", "福岡", "愛知", "神奈川", "宮城"];

const CITY_OF: Record<string, string> = { 北海道: "札幌", 宮城: "仙台", 愛知: "名古屋", 神奈川: "横浜" };

export function prefLabel(pref: string): string {
  return CITY_OF[pref] ? `${pref}（${CITY_OF[pref]}）` : pref;
}

const PREF_ORDER = [
  "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島", "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
  "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜", "静岡", "愛知", "三重", "滋賀", "京都", "大阪", "兵庫",
  "奈良", "和歌山", "鳥取", "島根", "岡山", "広島", "山口", "徳島", "香川", "愛媛", "高知", "福岡", "佐賀", "長崎",
  "熊本", "大分", "宮崎", "鹿児島", "沖縄",
];

/** 都道府県の一覧を、主な地域 → それ以外（北から）の順に並べる */
export function sortPrefs(prefs: Iterable<string>): string[] {
  const set = new Set(prefs);
  const rest = [...set].filter((p) => !MAIN_PREFS.includes(p)).sort((a, b) => PREF_ORDER.indexOf(a) - PREF_ORDER.indexOf(b));
  return [...MAIN_PREFS.filter((p) => set.has(p)), ...rest];
}

/**
 * 募集がその地域のものか。募集に場所が書いてあればそれで、無ければ会社の所在地で判断する。
 */
export function openingInPref(o: Opening, companyLocations: string[] | undefined, pref: string): boolean {
  if (o.location) return o.location.includes(pref) || (CITY_OF[pref] ? o.location.includes(CITY_OF[pref]) : false);
  return companyLocations?.includes(pref) ?? false;
}
