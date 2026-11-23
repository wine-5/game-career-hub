import { useMemo, useState } from "react";
import type { CompanyResult } from "../types.ts";
import { daysUntil } from "../lib/util.ts";
import { useAuth } from "../lib/auth.tsx";
import { KIND_LABEL, nextEvent, OUTCOME_LABEL, useTracker, type AppKind, type Application, type Outcome } from "../lib/tracker.tsx";
import { Icon } from "./Icon.tsx";
import { ApplicationCard } from "./ApplicationCard.tsx";
import { SearchSuggest } from "./SearchSuggest.tsx";
import { CompanyLogo } from "./CompanyLogo.tsx";
import { findCompany } from "../lib/search.ts";

type Tab = "active" | "done" | "all";

/** 選考の管理（どこに応募して、いまどの段階か）。ログインした人だけ */
export function TrackerView({ companies }: { companies: Map<string, CompanyResult> }) {
  const auth = useAuth();
  const { ready, applications } = useTracker();
  const [tab, setTab] = useState<Tab>("active");

  const sorted = useMemo(() => {
    // 選考中で予定の近い物 → 予定の無い選考中 → 終わった物
    const key = (a: Application) => {
      if (a.outcome !== "active") return 9e6;
      const d = daysUntil(nextEvent(a)?.date ?? "");
      return d === null ? 8e6 : d < 0 ? 7e6 + d : d;
    };
    return [...applications].sort((a, b) => key(a) - key(b) || b.updatedAt.localeCompare(a.updatedAt));
  }, [applications]);

  if (!auth.session) {
    return (
      <section className="section">
        <div className="gate">
          <Icon name="tracker" size={32} />
          <h2>選考の記録はログインすると使えます</h2>
          <p>応募した会社・いまの選考段階・面接の日程・出した ES や作品を、会社ごとに記録できます。記録は本人だけが見られます。</p>
          {auth.configured ? (
            <button className="btn btn--primary" onClick={auth.openLogin}>ログインする</button>
          ) : (
            <p className="hint">（このサイトではまだログインの準備ができていません）</p>
          )}
        </div>
      </section>
    );
  }

  const count = (o: Outcome) => applications.filter((a) => a.outcome === o).length;
  const soon = applications.filter((a) => {
    const d = daysUntil(nextEvent(a)?.date ?? "");
    return a.outcome === "active" && d !== null && d >= 0 && d <= 7;
  }).length;
  const shown = sorted.filter((a) => tab === "all" || (tab === "active" ? a.outcome === "active" : a.outcome !== "active"));

  return (
    <section className="section">
      <div className="section__head">
        <h2 className="section__title">
          <Icon name="tracker" size={20} /> 選考の記録
        </h2>
      </div>

      <div className="stats stats--tracker">
        <Stat value={count("active")} label="選考中" />
        <Stat value={soon} label="7日以内の予定" tone="warn" />
        <Stat value={count("offer")} label="内定" tone="ok" />
        <Stat value={applications.length} label="応募した会社" />
      </div>

      <AddApplication companies={companies} />

      <div className="seg" role="radiogroup" aria-label="表示">
        {([["active", "選考中"], ["done", "終わった選考"], ["all", "すべて"]] as const).map(([v, l]) => (
          <button key={v} role="radio" aria-checked={tab === v} className={`seg__item ${tab === v ? "is-active" : ""}`} onClick={() => setTab(v)}>
            {l}
          </button>
        ))}
      </div>

      {!ready && <p className="hint">読み込み中…</p>}
      {ready && shown.length === 0 && (
        <p className="section__lead">
          {applications.length === 0
            ? "まだ記録がありません。上の欄で会社を選ぶか、募集カード・会社の一覧の「選考を記録」ボタンから追加できます。"
            : "この表示に当てはまる記録はありません。"}
        </p>
      )}
      <div className="apps">
        {shown.map((a) => (
          // 名前だけで記録した物も、一覧の会社と名前が合えばロゴ・リンクを付ける
          <ApplicationCard key={a.id} a={a} company={companies.get(a.companyId) ?? findCompany(a.companyName, companies.values())} />
        ))}
      </div>
    </section>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: "ok" | "warn" }) {
  return (
    <div className={`stat ${tone ? `stat--${tone}` : ""}`}>
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

/** 会社名を打って選び、応募の記録を作る。終わった物（参加済みのインターンなど）もあとから足せる */
function AddApplication({ companies }: { companies: Map<string, CompanyResult> }) {
  const { add } = useTracker();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<AppKind>("newgrad");
  const [outcome, setOutcome] = useState<Outcome>("active");
  const [busy, setBusy] = useState(false);
  const list = useMemo(() => [...companies.values()], [companies]);
  const match = useMemo(() => (name.trim() ? findCompany(name, list) : undefined), [name, list]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    // 一覧の会社と名前が合えばその会社として記録する（ロゴ・リンクが付く）。合わなければ名前だけで記録する
    const id = await add({ companyId: match?.id ?? `custom:${n}`, companyName: match?.name ?? n, kind, title: title.trim(), outcome });
    setBusy(false);
    if (id) {
      setName("");
      setTitle("");
      setOutcome("active");
    }
  };

  return (
    <form className="add-app" onSubmit={submit}>
      <SearchSuggest value={name} onChange={setName} onPick={(c) => setName(c.name)} companies={list} placeholder="応募した会社の名前" max={6} />
      <input className="add-app__title" placeholder="題名（任意。例: 夏の5daysインターン）" value={title} onChange={(e) => setTitle(e.target.value)} />
      <select value={kind} onChange={(e) => setKind(e.target.value as AppKind)} aria-label="種類">
        {(Object.keys(KIND_LABEL) as AppKind[]).map((k) => (
          <option key={k} value={k}>{KIND_LABEL[k]}</option>
        ))}
      </select>
      <select value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)} aria-label="状態">
        {(Object.keys(OUTCOME_LABEL) as Outcome[]).map((o) => (
          <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>
        ))}
      </select>
      <button className="btn btn--primary" disabled={busy || !name.trim()}>
        <Icon name="plus" size={15} /> 記録する
      </button>
      {name.trim() && (
        <p className="add-app__match hint">
          {match ? (
            <>
              <CompanyLogo company={match} size={18} /> 「{match.name}」として記録します（ロゴ・採用ページのボタンが付きます）
            </>
          ) : (
            "一覧に無い会社として、名前だけで記録します"
          )}
        </p>
      )}
    </form>
  );
}

export { OUTCOME_LABEL };
