import { useId, useMemo, useRef, useState } from "react";
import type { CompanyResult } from "../types.ts";
import { statusOf } from "../lib/util.ts";
import { Icon } from "./Icon.tsx";
import { CompanyLogo } from "./CompanyLogo.tsx";

/** カタカナ→ひらがな・全角→半角・小文字にそろえて、表記ゆれでも当たるようにする */
const fold = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/[\s・\-ー]/g, "");

/**
 * 検索欄。打っている途中で、名前の合う会社を下に候補として出す。
 * 候補を選ぶと onPick（会社名で絞り込むなど）を呼ぶ。
 */
export function SearchSuggest({ value, onChange, onPick, companies, placeholder, max = 8 }: {
  value: string;
  onChange: (v: string) => void;
  onPick: (c: CompanyResult) => void;
  companies: CompanyResult[];
  placeholder: string;
  max?: number;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const blurTimer = useRef<number | undefined>(undefined);

  const items = useMemo(() => {
    const q = fold(value.trim());
    if (!q) return [];
    return companies
      .map((c) => {
        const name = fold(c.name);
        const hit = name.startsWith(q) ? 3 : name.includes(q) ? 2 : c.tags.some((t) => fold(t).includes(q)) || c.locations?.some((p) => fold(p).includes(q)) ? 1 : 0;
        return { c, hit, open: c.openings.filter((o) => statusOf(o) !== "closed").length };
      })
      .filter((x) => x.hit > 0)
      .sort((a, b) => b.hit - a.hit || b.open - a.open || a.c.name.localeCompare(b.c.name, "ja"))
      .slice(0, max);
  }, [value, companies, max]);

  const pick = (c: CompanyResult) => {
    onPick(c);
    setOpen(false);
  };
  const show = open && items.length > 0;

  return (
    <div className="suggest">
      <label className="search">
        <Icon name="search" size={15} />
        <input
          type="search"
          placeholder={placeholder}
          value={value}
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          // 候補を押す前に閉じないよう、少し待ってから閉じる
          onBlur={() => (blurTimer.current = window.setTimeout(() => setOpen(false), 150))}
          onKeyDown={(e) => {
            if (!show) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (i + 1) % items.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i - 1 + items.length) % items.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(items[active].c);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {value && (
          <button type="button" className="search__clear" aria-label="消す" onClick={() => onChange("")}>
            <Icon name="x" size={14} />
          </button>
        )}
      </label>
      {show && (
        <ul className="suggest__list" id={listId} role="listbox">
          {items.map(({ c, open: n }, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === active}
              className={`suggest__item ${i === active ? "is-active" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(c)}
            >
              <CompanyLogo company={c} size={28} />
              <span className="suggest__body">
                <span className="suggest__name">{c.name}</span>
                <span className="suggest__meta">{[...(c.locations ?? []).slice(0, 2), ...c.tags.slice(0, 2)].join(" ・ ")}</span>
              </span>
              <span className={`suggest__count ${n ? "" : "is-zero"}`}>{n ? `募集 ${n}` : "募集なし"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
