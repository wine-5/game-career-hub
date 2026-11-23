import { useMemo, useState } from "react";
import type { CompanyResult } from "../types.ts";
import { daysUntil } from "../lib/util.ts";
import { useAuth } from "../lib/auth.tsx";
import { KIND_LABEL, nextEvent, OUTCOME_LABEL, useTracker, type AppKind, type Application, type Outcome } from "../lib/tracker.tsx";
import { Icon } from "./Icon.tsx";
import { ApplicationCard } from "./ApplicationCard.tsx";

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
          <ApplicationCard key={a.id} a={a} company={companies.get(a.companyId)} />
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

/** 会社名を打って選び、応募の記録を作る */
function AddApplication({ companies }: { companies: Map<string, CompanyResult> }) {
  const { add } = useTracker();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AppKind>("newgrad");
  const [busy, setBusy] = useState(false);
  const list = useMemo(() => [...companies.values()].sort((a, b) => a.name.localeCompare(b.name, "ja")), [companies]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const c = list.find((x) => x.name === n);
    setBusy(true);
    // 一覧に無い会社も、名前だけで記録できる
    const id = await add({ companyId: c?.id ?? `custom:${n}`, companyName: c?.name ?? n, kind });
    setBusy(false);
    if (id) setName("");
  };

  return (
    <form className="add-app" onSubmit={submit}>
      <label className="search">
        <Icon name="search" size={15} />
        <input list="company-names" placeholder="応募した会社の名前" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <datalist id="company-names">
        {list.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
      <select value={kind} onChange={(e) => setKind(e.target.value as AppKind)} aria-label="種類">
        {(Object.keys(KIND_LABEL) as AppKind[]).map((k) => (
          <option key={k} value={k}>{KIND_LABEL[k]}</option>
        ))}
      </select>
      <button className="btn btn--primary" disabled={busy || !name.trim()}>
        <Icon name="plus" size={15} /> 記録する
      </button>
    </form>
  );
}

export { OUTCOME_LABEL };
