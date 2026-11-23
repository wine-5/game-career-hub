import type { OpeningType } from "../types.ts";
import { Icon } from "./Icon.tsx";

export type Sort = "deadline" | "new" | "company";

export interface Filters {
  type: OpeningType | "all";
  tag: string | "all";
  showClosed: boolean;
  query: string;
  sort: Sort;
}

export const DEFAULT_FILTERS: Filters = {
  type: "all", tag: "all", showClosed: false, query: "", sort: "deadline",
};

const TYPES: { v: Filters["type"]; label: string }[] = [
  { v: "all", label: "すべて" },
  { v: "internship", label: "インターン" },
  { v: "newgrad", label: "新卒採用" },
  { v: "event", label: "説明会・セミナー" },
];

export function FilterBar({ f, set, tags, resultCount }: {
  f: Filters;
  set: (patch: Partial<Filters>) => void;
  tags: string[];
  resultCount: number;
}) {
  return (
    <div className="filters">
      <div className="seg" role="radiogroup" aria-label="種類">
        {TYPES.map((t) => (
          <button
            key={t.v}
            role="radio"
            aria-checked={f.type === t.v}
            className={`seg__item ${f.type === t.v ? "is-active" : ""}`}
            onClick={() => set({ type: t.v })}
          >
            {t.label}
          </button>
        ))}
      </div>
      <label className="search">
        <Icon name="search" size={16} />
        <input type="search" placeholder="会社名・キーワードで検索" value={f.query} onChange={(e) => set({ query: e.target.value })} />
      </label>
      <label className="select">
        <span>分類</span>
        <select value={f.tag} onChange={(e) => set({ tag: e.target.value })}>
          <option value="all">すべて</option>
          {tags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="select">
        <span>並び順</span>
        <select value={f.sort} onChange={(e) => set({ sort: e.target.value as Sort })}>
          <option value="deadline">締切が近い順</option>
          <option value="new">新着順</option>
          <option value="company">会社名順</option>
        </select>
      </label>
      <label className="check">
        <input type="checkbox" checked={f.showClosed} onChange={(e) => set({ showClosed: e.target.checked })} />
        締切済みも表示
      </label>
      <span className="filters__count">
        <b>{resultCount}</b> 件
      </span>
    </div>
  );
}
