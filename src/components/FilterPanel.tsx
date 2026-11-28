import { useCallback, useEffect, useState } from "react";
import type { CompanyResult } from "../types.ts";
import { SearchSuggest } from "./SearchSuggest.tsx";
import { ConditionSelects } from "./ConditionSelects.tsx";
import { Icon } from "./Icon.tsx";
import { CONDITION_SORT_LABEL, yen, type ConditionSort } from "../lib/conditions.ts";
import { prefLabel } from "../lib/util.ts";
import type { Filters, Sort } from "./FilterBar.tsx";

const TYPES: { v: Filters["type"]; label: string }[] = [
  { v: "all", label: "すべて" },
  { v: "internship", label: "インターン" },
  { v: "newgrad", label: "新卒" },
  { v: "event", label: "説明会" },
];

/** 「条件」のシートにある項目で、かかっている数（バッジに出す） */
function activeCount(f: Filters): number {
  return [f.pref !== "all", f.tag !== "all", f.salaryMin > 0, f.holidaysMin > 0, f.overtimeMax > 0, f.onlyNew, f.showClosed].filter(Boolean).length;
}

/**
 * 新しい表示で使う絞り込み。検索＋「条件」のシート＋種類の切り替え＋かかっている条件のチップ。
 */
export function FilterPanel({ f, set, reset, tags, prefs, companies, resultCount, resultLabel = "件", hideSort = false }: {
  f: Filters;
  set: (patch: Partial<Filters>) => void;
  /** すべて解除（絞り込みを初期に戻し、職種も「すべて」に戻す） */
  reset: () => void;
  tags: string[];
  prefs: string[];
  companies: CompanyResult[];
  resultCount: number;
  resultLabel?: string;
  hideSort?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const count = activeCount(f);
  // 絞り込みを変えても同じ関数にして、シートの Esc・スクロール止めをやり直させない
  const closeSheet = useCallback(() => setOpen(false), []);

  // かかっている条件を 1 つずつ外すチップ。種類は上のセグメントで見えているので出さない
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (f.onlyNew) chips.push({ key: "new", label: "NEW だけ", clear: () => set({ onlyNew: false }) });
  if (f.pref !== "all") chips.push({ key: "pref", label: prefLabel(f.pref), clear: () => set({ pref: "all" }) });
  if (f.tag !== "all") chips.push({ key: "tag", label: f.tag, clear: () => set({ tag: "all" }) });
  if (f.salaryMin) chips.push({ key: "salary", label: `初任給 ${yen(f.salaryMin)}以上`, clear: () => set({ salaryMin: 0 }) });
  if (f.holidaysMin) chips.push({ key: "holidays", label: `年間休日 ${f.holidaysMin}日以上`, clear: () => set({ holidaysMin: 0 }) });
  if (f.overtimeMax) chips.push({ key: "overtime", label: `残業 月${f.overtimeMax}時間以下`, clear: () => set({ overtimeMax: 0 }) });
  if (f.showClosed) chips.push({ key: "closed", label: "締切済みも表示", clear: () => set({ showClosed: false }) });
  if (f.query.trim()) chips.push({ key: "query", label: `「${f.query.trim()}」`, clear: () => set({ query: "" }) });

  return (
    <div className="fpanel">
      <div className="fpanel__row">
        <SearchSuggest
          value={f.query}
          onChange={(query) => set({ query })}
          onPick={(c) => set({ query: c.name })}
          companies={companies}
          placeholder="会社名・キーワードで検索"
        />
        <button className={`btn btn--ghost fpanel__btn ${count ? "is-on" : ""}`} onClick={() => setOpen(true)} aria-haspopup="dialog">
          <Icon name="filter" size={15} />
          条件
          {count > 0 && <span className="fpanel__badge">{count}</span>}
        </button>
      </div>

      <div className="seg fpanel__seg" role="radiogroup" aria-label="種類">
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

      {chips.length > 0 && (
        <div className="fpanel__chips">
          {chips.map((c) => (
            <button key={c.key} className="fchip" onClick={c.clear} aria-label={`${c.label}を外す`}>
              {c.label}
              <Icon name="x" size={12} />
            </button>
          ))}
          <button className="fpanel__reset" onClick={reset}>すべて解除</button>
        </div>
      )}

      <div className="fpanel__result">
        <span className="fpanel__count">
          <b>{resultCount}</b> {resultLabel}
        </span>
        {!hideSort && (
          <label className="select">
            <span>並び順</span>
            <select value={f.sort} onChange={(e) => set({ sort: e.target.value as Sort })}>
              <option value="deadline">日付が近い順</option>
              <option value="new">新着順</option>
              <option value="company">会社名順</option>
              {(Object.keys(CONDITION_SORT_LABEL) as ConditionSort[]).map((s) => (
                <option key={s} value={s}>{CONDITION_SORT_LABEL[s]}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {open && (
        <ConditionSheet f={f} set={set} tags={tags} prefs={prefs} resultCount={resultCount} resultLabel={resultLabel} onClose={closeSheet} />
      )}
    </div>
  );
}

/** 条件のシート（スマホは下から、広い画面は右からの引き出し） */
function ConditionSheet({ f, set, tags, prefs, resultCount, resultLabel, onClose }: {
  f: Filters;
  set: (patch: Partial<Filters>) => void;
  tags: string[];
  prefs: string[];
  resultCount: number;
  resultLabel: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // 開いている間は後ろのスクロールを止める
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="絞り込みの条件" onClick={onClose}>
      <div className="sheet__panel" onClick={(e) => e.stopPropagation()}>
        <header className="sheet__head">
          <h2 className="sheet__title">条件</h2>
          <button className="icon-btn sheet__close" onClick={onClose} aria-label="閉じる">
            <Icon name="x" size={18} />
          </button>
        </header>

        <div className="sheet__body">
          <Switch checked={f.onlyNew} onChange={(v) => set({ onlyNew: v })}>
            <span className="badge badge--new">NEW</span> だけ表示
          </Switch>

          <section className="sheet__group">
            <h3 className="sheet__label">地域</h3>
            <div className="chip-set">
              <Pick on={f.pref === "all"} onClick={() => set({ pref: "all" })}>すべて</Pick>
              {prefs.map((p) => (
                <Pick key={p} on={f.pref === p} onClick={() => set({ pref: p })}>{prefLabel(p)}</Pick>
              ))}
            </div>
          </section>

          <section className="sheet__group">
            <h3 className="sheet__label">分類</h3>
            <div className="chip-set">
              <Pick on={f.tag === "all"} onClick={() => set({ tag: "all" })}>すべて</Pick>
              {tags.map((t) => (
                <Pick key={t} on={f.tag === t} onClick={() => set({ tag: t })}>{t}</Pick>
              ))}
            </div>
          </section>

          <section className="sheet__group">
            <h3 className="sheet__label">待遇</h3>
            <div className="sheet__selects">
              <ConditionSelects f={f} set={set} />
            </div>
            <p className="hint">指定した項目が書かれていない会社は外れます。</p>
          </section>

          <Switch checked={f.showClosed} onChange={(v) => set({ showClosed: v })}>締切済みも表示</Switch>
        </div>

        <footer className="sheet__foot">
          <button className="btn btn--primary btn--block" onClick={onClose}>
            {resultCount} {resultLabel}を表示
          </button>
        </footer>
      </div>
    </div>
  );
}

function Pick({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`pick ${on ? "is-on" : ""}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

function Switch({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <button role="switch" aria-checked={checked} className={`switch ${checked ? "is-on" : ""}`} onClick={() => onChange(!checked)}>
      <span className="switch__label">{children}</span>
      <span className="switch__track" aria-hidden><i /></span>
    </button>
  );
}
