import type { CSSProperties } from "react";
import { ROLE_LABEL } from "../types.ts";
import { ROLE_COLOR } from "../lib/util.ts";
import { Icon } from "./Icon.tsx";
import { LINK_META } from "./CompanyLinks.tsx";

const STEPS = [
  { title: "会社の採用ページを確認", text: "監視リストにある会社の公式採用ページを取得します。robots.txt を守り、間隔をあけてアクセスします。" },
  { title: "変わったページだけ AI が読む", text: "前回から中身が変わった会社だけ、AI が対象の卒業年向けの募集・締切・職種を読み取ります。" },
  { title: "一覧にまとめて公開", text: "職種や種類で絞り込める一覧にして、このサイトに反映します。詳しくは必ず公式ページへ。" },
];

export function About({ model, targetYear }: { model: string | null; targetYear: number | null }) {
  return (
    <section className="section">
      <h2 className="section__title">
        <Icon name="info" size={20} /> このサイトについて
      </h2>
      <p className="section__lead">
        ゲーム会社の「いつ新卒採用が始まるか」「今どのインターンを募集しているか」を、公式ページから集めて一覧にした就活ボードです。
        {targetYear && ` いまは ${targetYear} 年卒（${String(targetYear).slice(2)}卒）向けの募集だけを載せています。`}
      </p>

      <div className="steps">
        {STEPS.map((s, i) => (
          <div key={s.title} className="step">
            <span className="step__no">STEP {i + 1}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
        ))}
      </div>

      <h3 className="subhead">ボタンの意味</h3>
      <div className="legend">
        {(Object.keys(LINK_META) as (keyof typeof LINK_META)[]).map((k) => (
          <div key={k} className="legend__row">
            <span className={`link-icon link-icon--${k}`}>
              <Icon name={LINK_META[k].icon} size={18} />
            </span>
            {LINK_META[k].label}
            {k === "philosophy" && "（理念が書かれている所まで飛びます）"}
          </div>
        ))}
      </div>

      <h3 className="subhead">職種</h3>
      <div className="role-legend">
        {(["programmer", "planner", "effect", "artist"] as const).map((r) => (
          <span key={r} className="role-pill" style={{ "--role": ROLE_COLOR[r] } as CSSProperties}>
            {ROLE_LABEL[r]}
          </span>
        ))}
      </div>

      <h3 className="subhead">注意</h3>
      <ul className="notes">
        <li>AI の読み取りには誤りがあります。日付や条件は必ず公式ページで確認してください。</li>
        <li>載せているのは要約とリンクだけです。本文は各社の公式ページをご覧ください。</li>
        <li>自動アクセスを断っているサイトは対象にしていません。</li>
        <li>見るだけならログインは要りません。☆ のお気に入りを保存するときだけログインします。</li>
        {model && <li>読み取り: {model === "claude-code" ? "Claude Code" : model}</li>}
      </ul>
    </section>
  );
}
