import { useState } from "react";
import type { CompanyResult } from "../types.ts";
import { daysUntil, formatDate } from "../lib/util.ts";
import {
  currentStepIndex, DOC_KINDS, KIND_LABEL, nextEvent, OUTCOME_LABEL, useTracker,
  type Application, type Outcome, type Step, type SubmittedDoc,
} from "../lib/tracker.tsx";
import { Icon } from "./Icon.tsx";
import { CompanyLogo } from "./CompanyLogo.tsx";
import { CompanyLinks } from "./CompanyLinks.tsx";

/** 1 社ぶんの選考の記録。いまの段階・次の予定・出した書類・メモ */
export function ApplicationCard({ a, company }: { a: Application; company?: CompanyResult }) {
  const { update, remove } = useTracker();
  const [open, setOpen] = useState(false);
  const cur = currentStepIndex(a);
  const allDone = a.steps.length > 0 && a.steps.every((s) => s.done);
  const next = nextEvent(a);
  const left = daysUntil(next?.date ?? "");

  const setSteps = (steps: Step[]) => update(a.id, { steps });
  const setDocs = (documents: SubmittedDoc[]) => update(a.id, { documents });

  /** その段階まで進んだことにする（前は済み、そこから後は未完了） */
  const moveTo = (i: number) => setSteps(a.steps.map((s, j) => ({ ...s, done: j < i })));
  const advance = () => {
    const steps = a.steps.map((s, j) => (j === cur ? { ...s, done: true } : s));
    // 最後の段階（内定・参加）まで済んだら結果も内定にする
    const finished = steps.every((s) => s.done);
    update(a.id, finished && a.kind === "newgrad" ? { steps, outcome: "offer" } : { steps });
  };

  return (
    <article className={`app app--${a.outcome}`}>
      <header className="app__head">
        <CompanyLogo company={company ?? { name: a.companyName }} size={40} />
        <div className="app__company">
          <p className="app__name">{a.companyName}</p>
          <p className="app__kind">
            <span className={`badge badge--type-${a.kind === "other" ? "event" : a.kind}`}>{KIND_LABEL[a.kind]}</span>
            {a.title && <span className="app__title">{a.title}</span>}
          </p>
        </div>
        <select
          className={`outcome outcome--${a.outcome}`}
          value={a.outcome}
          onChange={(e) => update(a.id, { outcome: e.target.value as Outcome })}
          aria-label="結果"
        >
          {(Object.keys(OUTCOME_LABEL) as Outcome[]).map((o) => (
            <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>
          ))}
        </select>
      </header>

      {/* 選考の流れ。押すとその段階まで進んだことになる */}
      <ol className="flow" aria-label="選考の流れ">
        {a.steps.map((s, i) => {
          const state = s.done ? "done" : i === cur && a.outcome === "active" ? "now" : "todo";
          return (
            <li key={i} className={`flow__step is-${state}`}>
              <button onClick={() => moveTo(s.done && i === cur - 1 ? i : i)} title={`「${s.name}」の段階にする`}>
                <span className="flow__dot">{s.done ? <Icon name="check" size={12} /> : i + 1}</span>
                <span className="flow__label">{s.name}</span>
                {s.date && <span className="flow__date">{formatDate(s.date)}</span>}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="app__now">
        {a.outcome !== "active" ? (
          <span className="app__status">{OUTCOME_LABEL[a.outcome]}</span>
        ) : allDone ? (
          <span className="app__status">すべての段階が終わりました</span>
        ) : (
          <span className="app__status">
            いま: <b>{a.steps[cur]?.name ?? "—"}</b>
            {next && (
              <span className={`app__next ${left !== null && left <= 3 ? "is-hot" : ""}`}>
                <Icon name="calendar" size={13} />
                {next.name} {formatDate(next.date!)}
                {left !== null && left >= 0 && `（${left === 0 ? "今日" : `あと${left}日`}）`}
              </span>
            )}
          </span>
        )}
        {a.outcome === "active" && !allDone && (
          <button className="btn btn--primary btn--sm" onClick={advance}>
            「{a.steps[cur]?.name}」を通過
            <Icon name="arrow" size={13} />
          </button>
        )}
      </div>

      <div className="app__foot">
        <span className="app__docs-count">
          <Icon name="doc" size={14} /> 提出物 {a.documents.length} 件
        </span>
        {company && <CompanyLinks links={company.links} hide={["philosophy"]} />}
        <button className="btn btn--ghost btn--sm app__toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "閉じる" : "詳しく記録する"}
        </button>
      </div>

      {open && (
        <div className="app__detail" key={a.updatedAt}>
          <section>
            <h4>選考の流れ</h4>
            <p className="hint">会社ごとに段階の名前や数を変えられます。日付を入れると「次の予定」に出ます。</p>
            <ul className="rows">
              {a.steps.map((s, i) => (
                <li key={i} className="row">
                  <input
                    type="checkbox"
                    checked={s.done}
                    onChange={(e) => setSteps(a.steps.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))}
                    aria-label="済み"
                  />
                  <input
                    className="row__grow"
                    defaultValue={s.name}
                    onBlur={(e) => e.target.value !== s.name && setSteps(a.steps.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    aria-label="段階の名前"
                  />
                  <input
                    type="date"
                    defaultValue={s.date ?? ""}
                    onChange={(e) => setSteps(a.steps.map((x, j) => (j === i ? { ...x, date: e.target.value || undefined } : x)))}
                    aria-label="日付"
                  />
                  <button className="icon-btn" onClick={() => setSteps(a.steps.filter((_, j) => j !== i))} aria-label="この段階を消す">
                    <Icon name="trash" size={15} />
                  </button>
                </li>
              ))}
            </ul>
            <button className="btn btn--ghost btn--sm" onClick={() => setSteps([...a.steps.slice(0, -1), { name: "面接", done: false }, ...a.steps.slice(-1)])}>
              <Icon name="plus" size={14} /> 段階を足す
            </button>
          </section>

          <section>
            <h4>出した書類・作品</h4>
            <p className="hint">ES・履歴書・ポートフォリオなど、何をいつ出したかの控えです。ES の内容をメモに残しておくと面接前の見直しに使えます。</p>
            {a.documents.length === 0 && <p className="hint">まだありません。</p>}
            <ul className="docs">
              {a.documents.map((d, i) => {
                const patch = (p: Partial<SubmittedDoc>) => setDocs(a.documents.map((x, j) => (j === i ? { ...x, ...p } : x)));
                return (
                  <li key={i} className="doc">
                    <div className="row">
                      <select value={d.kind} onChange={(e) => patch({ kind: e.target.value })} aria-label="種類">
                        {DOC_KINDS.map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                      </select>
                      <input
                        className="row__grow"
                        placeholder="題名（例: 本選考 ES）"
                        defaultValue={d.title}
                        onBlur={(e) => e.target.value !== d.title && patch({ title: e.target.value })}
                      />
                      <input type="date" defaultValue={d.date ?? ""} onChange={(e) => patch({ date: e.target.value || undefined })} aria-label="提出日" />
                      <button className="icon-btn" onClick={() => setDocs(a.documents.filter((_, j) => j !== i))} aria-label="消す">
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                    <input
                      type="url"
                      placeholder="控えの置き場の URL（Google ドライブなど・任意）"
                      defaultValue={d.url ?? ""}
                      onBlur={(e) => e.target.value !== (d.url ?? "") && patch({ url: e.target.value || undefined })}
                    />
                    <textarea
                      rows={3}
                      placeholder="書いた内容・設問の控え（任意）"
                      defaultValue={d.note ?? ""}
                      onBlur={(e) => e.target.value !== (d.note ?? "") && patch({ note: e.target.value || undefined })}
                    />
                    {d.url && (
                      <a className="doc__link" href={d.url} target="_blank" rel="noopener noreferrer">
                        控えを開く <Icon name="external" size={12} />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setDocs([...a.documents, { kind: "ES", title: "", date: new Date().toISOString().slice(0, 10) }])}
            >
              <Icon name="plus" size={14} /> 提出物を足す
            </button>
          </section>

          <section>
            <h4>メモ</h4>
            <textarea
              rows={4}
              placeholder="面接で聞かれたこと、志望動機、マイページの ID など"
              defaultValue={a.memo}
              onBlur={(e) => e.target.value !== a.memo && update(a.id, { memo: e.target.value })}
            />
          </section>

          <div className="app__danger">
            <span className="hint">更新 {formatDate(a.updatedAt.slice(0, 10))}</span>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => confirm(`${a.companyName} の記録を消しますか？`) && remove(a.id)}
            >
              <Icon name="trash" size={14} /> この記録を消す
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
