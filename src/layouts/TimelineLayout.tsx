import { useEffect, useMemo, useState } from "react";
import type { CompanyResult, Opening } from "../types.ts";
import { TYPE_LABEL } from "../types.ts";
import { daysUntil, isNewOpening, todayJst } from "../lib/util.ts";
import { closedDate, nextWhen, type When } from "../lib/when.ts";
import { OpeningDetail } from "../components/OpeningDetail.tsx";
import type { LayoutProps } from "./types.ts";
import "./timeline.css";

interface Item {
  o: Opening;
  c: CompanyResult;
  w: When | null;
}

interface Group {
  key: string;
  label: string;
  items: Item[];
}

const WEEK = "日月火水木金土";

/** 日付の箱に出す「月/日」と曜日 */
function parts(date: string): { md: string; wd: string } {
  const [y, m, d] = date.split("-").map(Number);
  return { md: `${m}/${d}`, wd: WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] };
}

/** 今月から数えて何か月先か（0 = 今月） */
function monthsAhead(date: string): number {
  const [ty, tm] = todayJst().split("-").map(Number);
  const [y, m] = date.split("-").map(Number);
  return (y - ty) * 12 + (m - tm);
}

/** 日付順（締切・受付開始の近い順に、今週・今月…と区切る） */
export function TimelineLayout({ shown, companies, role, lastRun, showClosed }: LayoutProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [undatedOpen, setUndatedOpen] = useState(false);

  const { groups, undated, closed, fresh } = useMemo(() => {
    const items: Item[] = [];
    for (const o of shown) {
      const c = companies.get(o.companyId);
      if (c) items.push({ o, c, w: nextWhen(o) });
    }
    const buckets: Record<"week" | "month" | "next" | "later", Item[]> = { week: [], month: [], next: [], later: [] };
    const undated: Item[] = [];
    const closed: Item[] = [];
    for (const it of items) {
      if (it.w) {
        if (it.w.days <= 6) buckets.week.push(it);
        else {
          const m = monthsAhead(it.w.date);
          (m <= 0 ? buckets.month : m === 1 ? buckets.next : buckets.later).push(it);
        }
      } else {
        const d = daysUntil(it.o.deadline);
        (d !== null && d < 0 ? closed : undated).push(it);
      }
    }
    const byDays = (a: Item, b: Item) => a.w!.days - b.w!.days;
    for (const k of Object.keys(buckets) as (keyof typeof buckets)[]) buckets[k].sort(byDays);
    // 締切済みは過ぎて間もない物から
    closed.sort((a, b) => daysUntil(b.o.deadline)! - daysUntil(a.o.deadline)!);
    const groups: Group[] = [
      { key: "week", label: "今週", items: buckets.week },
      { key: "month", label: "今月", items: buckets.month },
      { key: "next", label: "来月", items: buckets.next },
      { key: "later", label: "それ以降", items: buckets.later },
    ].filter((g) => g.items.length > 0);
    return { groups, undated, closed, fresh: items.filter((it) => isNewOpening(it.o.firstSeen, lastRun)) };
  }, [shown, companies, lastRun]);

  // NEW の帯から開いたとき、その行まで運ぶ
  const [jump, setJump] = useState<string | null>(null);
  useEffect(() => {
    if (!jump) return;
    document.getElementById(`tl-row-${jump}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setJump(null);
  }, [jump, undatedOpen]);

  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  const jumpTo = (it: Item) => {
    if (!it.w && !closed.includes(it)) setUndatedOpen(true);
    setOpenId(it.o.id);
    setJump(it.o.id);
  };

  const row = (it: Item) => {
    const { o, c, w } = it;
    const open = openId === o.id;
    const isNew = isNewOpening(o.firstSeen, lastRun);
    const p = w ? parts(w.date) : o.deadline ? parts(o.deadline) : null;
    const tone = !w ? "is-none" : w.kind === "start" ? "is-start" : w.days <= 3 ? "is-hot" : w.days <= 7 ? "is-warm" : "";
    return (
      <li key={o.id} id={`tl-row-${o.id}`} className={`tl-item ${open ? "is-open" : ""}`}>
        <button className="tl-row" aria-expanded={open} onClick={() => toggle(o.id)}>
          <span className={`tl-date ${tone}`}>
            {p ? (
              <>
                {w?.kind === "start" && <span className="tl-date__kind">受付開始</span>}
                <span className="tl-date__md">{p.md}</span>
                <span className="tl-date__sub">{p.wd}</span>
                <span className="tl-date__sub">
                  {w ? (w.days === 0 ? "今日" : w.kind === "start" ? `${w.days}日後` : `あと${w.days}日`) : "締切済み"}
                </span>
              </>
            ) : (
              <span className="tl-date__sub">日程なし</span>
            )}
          </span>
          <span className="tl-row__body">
            <span className="tl-row__meta">
              {c.name}
              {w ? ` ・ ${w.kind === "start" ? "受付開始" : "締切"}` : ""}
            </span>
            <span className="tl-row__title">{o.title}</span>
            {!w && !closedDate(o) && o.applyStart && <span className="tl-row__start">受付開始 {parts(o.applyStart).md}</span>}
            <span className="tl-row__badges">
              <span className={`badge badge--type-${o.type}`}>{TYPE_LABEL[o.type]}</span>
              {isNew && <span className="badge badge--new">NEW</span>}
            </span>
          </span>
          <span className="tl-row__chev" aria-hidden>›</span>
        </button>
        {open && (
          <div className="tl-detail">
            <OpeningDetail o={o} company={c} role={role} lastRun={lastRun} showCompany />
          </div>
        )}
      </li>
    );
  };

  const undatedBlock = undated.length > 0 && (
    <section className="tl-group tl-group--undated" aria-label="締切が書かれていない募集">
      <h3 className="tl-group__head">
        締切が書かれていない <span className="tl-group__count">{undated.length}件</span>
        <button className="btn btn--ghost btn--sm tl-group__toggle" aria-expanded={undatedOpen} onClick={() => setUndatedOpen((v) => !v)}>
          {undatedOpen ? "たたむ" : "開く"}
        </button>
      </h3>
      {undatedOpen && <ul className="tl-list">{undated.map(row)}</ul>}
    </section>
  );

  return (
    <div className="tl">
      {fresh.length > 0 && (
        <section className="tl-new" aria-label="今回の新着">
          <p className="tl-new__head">
            <span className="badge badge--new">NEW</span>
            <span>
              {lastRun ? `${Number(lastRun.slice(5, 7))}/${Number(lastRun.slice(8, 10))} の更新で見つかった ` : "新しく見つかった "}
              {fresh.length} 件
            </span>
          </p>
          <ul className="tl-new__strip">
            {fresh.map((it) => (
              <li key={it.o.id}>
                <button className="tl-new__card" onClick={() => jumpTo(it)}>
                  <span className="tl-new__company">{it.c.name}</span>
                  <span className="tl-new__title">{it.o.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="tl-cols">
        <div className="tl-main">
          {groups.map((g) => (
            <section key={g.key} className="tl-group">
              <h3 className="tl-group__head">
                {g.label} <span className="tl-group__count">{g.items.length}件</span>
              </h3>
              <ul className="tl-list">{g.items.map(row)}</ul>
            </section>
          ))}
          {showClosed && closed.length > 0 && (
            <section className="tl-group tl-group--closed">
              <h3 className="tl-group__head">
                締切済み <span className="tl-group__count">{closed.length}件</span>
              </h3>
              <ul className="tl-list">{closed.map(row)}</ul>
            </section>
          )}
        </div>
        {/* 狭い画面では日付のある段の下、721px 以上では右の列 */}
        {undatedBlock && <aside className="tl-side">{undatedBlock}</aside>}
      </div>
    </div>
  );
}
