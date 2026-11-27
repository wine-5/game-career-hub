import type { CompanyResult, OpeningType } from "../types.ts";
import { SearchSuggest } from "./SearchSuggest.tsx";
import { ConditionSelects } from "./ConditionSelects.tsx";
import { CONDITION_SORT_LABEL, NO_CONDITION, type ConditionFilter, type ConditionSort } from "../lib/conditions.ts";
import { prefLabel } from "../lib/util.ts";

export type Sort = "deadline" | "new" | "company" | ConditionSort;

export interface Filters extends ConditionFilter {
  type: OpeningType | "all";
  tag: string | "all";
  /** 都道府県（「北海道」など） */
  pref: string | "all";
  showClosed: boolean;
  /** 最後の更新で新しく見つけた募集（NEW）だけを出す */
  onlyNew: boolean;
  query: string;
  sort: Sort;
}

export const DEFAULT_FILTERS: Filters = {
  type: "all", tag: "all", pref: "all", showClosed: false, onlyNew: false, query: "", sort: "deadline", ...NO_CONDITION,
};

const TYPES: { v: Filters["type"]; label: string }[] = [
  { v: "all", label: "すべて" },
  { v: "internship", label: "インターン" },
  { v: "newgrad", label: "新卒採用" },
  { v: "event", label: "説明会・セミナー" },
];

export function FilterBar({ f, set, tags, prefs, resultCount, companies }: {
  companies: CompanyResult[];
  f: Filters;
  set: (patch: Partial<Filters>) => void;
  tags: string[];
  prefs: string[];
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
      <SearchSuggest
        value={f.query}
        onChange={(query) => set({ query })}
        onPick={(c) => set({ query: c.name })}
        companies={companies}
        placeholder="会社名・キーワードで検索"
      />
      <label className="select">
        <span>地域</span>
        <select value={f.pref} onChange={(e) => set({ pref: e.target.value })}>
          <option value="all">すべて</option>
          {prefs.map((p) => (
            <option key={p} value={p}>{prefLabel(p)}</option>
          ))}
        </select>
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
          {(Object.keys(CONDITION_SORT_LABEL) as ConditionSort[]).map((s) => (
            <option key={s} value={s}>{CONDITION_SORT_LABEL[s]}</option>
          ))}
        </select>
      </label>
      <ConditionSelects f={f} set={set} />
      <label className={`check check--new ${f.onlyNew ? "is-on" : ""}`}>
        <input type="checkbox" checked={f.onlyNew} onChange={(e) => set({ onlyNew: e.target.checked })} />
        <span className="badge badge--new">NEW</span>だけ表示
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
