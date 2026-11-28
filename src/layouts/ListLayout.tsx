import { useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ROLE_LABEL, TYPE_LABEL } from "../types.ts";
import { isNewOpening, ROLE_COLOR } from "../lib/util.ts";
import { nextWhen } from "../lib/when.ts";
import { CompanyLogo } from "../components/CompanyLogo.tsx";
import { Icon } from "../components/Icon.tsx";
import { OpeningDetail } from "../components/OpeningDetail.tsx";
import type { LayoutProps } from "./types.ts";
import "./list.css";

/** 画面が 900px 以上か（左に一覧・右に詳細を並べられるか） */
function useWide(): boolean {
  const query = "(min-width: 900px)";
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

/** 一覧＋詳細 */
export function ListLayout({ shown, companies, role, lastRun }: LayoutProps) {
  const wide = useWide();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const rows = useMemo(() => shown.flatMap((o) => {
    const c = companies.get(o.companyId);
    return c ? [{ o, c }] : [];
  }), [shown, companies]);

  // 選んだ物が絞り込みで消えたら先頭を出す（広い画面では何も選んでいなくても先頭）
  const current = rows.find((r) => r.o.id === selectedId) ?? (wide ? rows[0] : undefined);
  const sheetItem = !wide && sheetOpen ? rows.find((r) => r.o.id === selectedId) : undefined;
  const sheetShown = Boolean(sheetItem);

  const closeSheet = () => setSheetOpen(false);

  // シートを開いている間は Esc で閉じ、背面のスクロールを止める
  useEffect(() => {
    if (!sheetShown) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sheetShown]);

  const pick = (id: string) => {
    setSelectedId(id);
    if (!wide) setSheetOpen(true);
  };

  // 上下キーで前後の行へ（広い画面では詳細も追従）
  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const btns = [...e.currentTarget.querySelectorAll<HTMLButtonElement>(".ls-row")];
    const i = btns.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const next = btns[i + (e.key === "ArrowDown" ? 1 : -1)];
    if (!next) return;
    e.preventDefault();
    next.focus();
    if (wide) setSelectedId(next.dataset.id ?? null);
  };

  if (rows.length === 0) return null;

  return (
    <div className="ls">
      <ul className="ls-list" onKeyDown={onKeyDown}>
        {rows.map(({ o, c }) => {
          const w = nextWhen(o);
          const on = current?.o.id === o.id;
          const isNew = isNewOpening(o.firstSeen, lastRun);
          return (
            <li key={o.id}>
              <button className={`ls-row ${on ? "is-on" : ""}`} data-id={o.id} aria-current={on ? "true" : undefined} onClick={() => pick(o.id)}>
                <CompanyLogo company={c} size={30} />
                <span className="ls-row__body">
                  <span className="ls-row__meta">{c.name} ・ {TYPE_LABEL[o.type]}</span>
                  <span className="ls-row__title">
                    {isNew && <span className="badge badge--new ls-row__new">NEW</span>}
                    {o.title}
                  </span>
                </span>
                <span className="ls-row__side">
                  {w && (
                    <span className={`ls-row__date ${w.kind === "start" ? "is-start" : w.days <= 3 ? "is-hot" : w.days <= 7 ? "is-warm" : ""}`}>
                      {Number(w.date.slice(5, 7))}/{Number(w.date.slice(8, 10))} {w.kind === "start" ? "開始" : "締切"}
                    </span>
                  )}
                  <span className="ls-row__dots" aria-label={o.roles.map((r) => ROLE_LABEL[r]).join("・")}>
                    {o.roles.map((r) => (
                      <i key={r} style={{ "--role": ROLE_COLOR[r] } as CSSProperties} />
                    ))}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {wide && current && (
        <aside className="ls-pane" aria-label="募集の詳細">
          <OpeningDetail key={current.o.id} o={current.o} company={current.c} role={role} lastRun={lastRun} showCompany />
        </aside>
      )}

      {sheetItem && (
        <div className="ls-sheet" onClick={closeSheet}>
          <div className="ls-sheet__panel" role="dialog" aria-modal="true" aria-label="募集の詳細" onClick={(e) => e.stopPropagation()}>
            <div className="ls-sheet__head">
              <span className="ls-sheet__grip" aria-hidden />
              <button className="icon-btn ls-sheet__close" aria-label="閉じる" onClick={closeSheet}>
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="ls-sheet__body">
              <OpeningDetail key={sheetItem.o.id} o={sheetItem.o} company={sheetItem.c} role={role} lastRun={lastRun} showCompany />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
