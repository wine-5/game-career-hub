import type { CSSProperties } from "react";
import { KIcon, RoleIcon, Vfx } from "./Icons.tsx";
import { ROLE_COLOR } from "../lib/util.ts";

const STEPS = [
  { icon: "home", vfx: "orb", title: "会社の採用ページを巡回", text: "監視リストにある会社の公式採用ページを毎朝6時に確認します。robots.txt を守り、間隔をあけてアクセスします。" },
  { icon: "gear", vfx: "energy_ring", title: "変化したページだけ AI が読む", text: "前回と中身が変わった会社だけ、AI が新卒・インターンの募集・締切・対象の職種を読み取ります。" },
  { icon: "menuGrid", vfx: "starburst", title: "一覧に整理して公開", text: "職種・卒業年・締切で絞り込める一覧にして、このサイトに反映します。詳細は必ず公式ページへ。" },
];

export function About({ model }: { model: string | null }) {
  return (
    <section className="section about">
      <h2 className="section__title">
        <KIcon name="information" size={20} /> このサイトについて
      </h2>
      <p className="section__lead">
        ゲーム会社の紹介サイトはあっても、「いつ新卒採用が始まるか」「今どのインターンを募集しているか」を一覧で見られる場所はあまりありません。
        Game Career Hub は、それを AI で毎日自動更新するための、仲間うちのための就活ボードです。
      </p>

      <div className="steps">
        {STEPS.map((s, i) => (
          <div key={s.title} className="step">
            <Vfx name={s.vfx} color="var(--c-accent)" className="step__fx" />
            <span className="step__no">0{i + 1}</span>
            <KIcon name={s.icon} size={28} color="var(--c-accent)" />
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
        ))}
      </div>

      <h3 className="subhead">対応している職種</h3>
      <div className="role-legend">
        {(["programmer", "planner", "effect", "artist"] as const).map((r) => (
          <span key={r} className="role-pill role-pill--lg" style={{ "--role": ROLE_COLOR[r] } as CSSProperties}>
            <RoleIcon role={r} size={16} />
            {{ programmer: "プログラマー", planner: "プランナー", effect: "エフェクトデザイナー", artist: "アーティスト" }[r]}
          </span>
        ))}
      </div>

      <h3 className="subhead">ログインについて</h3>
      <p className="section__lead">
        見るだけならログインは要りません。★ でお気に入りを保存し、「お気に入り」のページでまとめて見たいときだけログインしてください。
      </p>

      <h3 className="subhead">注意</h3>
      <ul className="notes">
        <li>AI の読み取りには誤りがあります。日付や条件は必ず公式ページで確認してください。</li>
        <li>掲載しているのは要約とリンクだけです。本文は各社の公式ページをご覧ください。</li>
        <li>自動アクセスを断っているサイトは対象にしていません。</li>
        {model && <li>読み取りに使っている AI モデル: {model}</li>}
      </ul>
    </section>
  );
}
