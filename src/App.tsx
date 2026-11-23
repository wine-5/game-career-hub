import { useEffect, useMemo, useState } from "react";
import type { CompanyResult, JobsData, Opening, Role } from "./types.ts";
import { ROLES } from "./types.ts";
import { daysUntil, openingInPref, sortPrefs, statusOf, todayJst } from "./lib/util.ts";
import { useAuth } from "./lib/auth.tsx";
import { Header, type View } from "./components/Header.tsx";
import { Hero } from "./components/Hero.tsx";
import { RolePicker } from "./components/RolePicker.tsx";
import { DEFAULT_FILTERS, FilterBar, type Filters } from "./components/FilterBar.tsx";
import { OpeningCard } from "./components/OpeningCard.tsx";
import { DeadlineRail } from "./components/DeadlineRail.tsx";
import { CompanyGrid } from "./components/CompanyGrid.tsx";
import { FavoritesView } from "./components/FavoritesView.tsx";
import { TrackerView } from "./components/TrackerView.tsx";
import { GamesModal } from "./components/GameStrip.tsx";
import { LoginModal } from "./components/LoginModal.tsx";
import { About } from "./components/About.tsx";
import { Icon, type IconName } from "./components/Icon.tsx";

function useHashView(): View {
  const read = (): View => {
    const v = window.location.hash.replace(/^#\/?/, "").split("?")[0];
    return v === "companies" || v === "tracker" || v === "favorites" || v === "about" ? v : "home";
  };
  const [view, setView] = useState<View>(read);
  useEffect(() => {
    const on = () => {
      setView(read());
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return view;
}

const FILTER_KEY = "gch.filters.v1";
function loadFilters(): Filters {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    return raw ? { ...DEFAULT_FILTERS, ...JSON.parse(raw), query: "" } : DEFAULT_FILTERS;
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function App() {
  const view = useHashView();
  const auth = useAuth();
  const [data, setData] = useState<JobsData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [role, setRole] = useState<Role | "all">(() => {
    try {
      return (localStorage.getItem("gch.role") as Role | "all") || "all";
    } catch {
      return "all";
    }
  });
  const [filters, setFilters] = useState<Filters>(loadFilters);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/jobs.json`, { cache: "no-cache" })
      .then((r) => r.json() as Promise<JobsData>)
      .then(setData)
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
      localStorage.setItem("gch.role", role);
    } catch {
      /* 保存できない環境では覚えないだけ */
    }
  }, [filters, role]);

  const companies = useMemo(() => new Map((data?.companies ?? []).map((c) => [c.id, c])), [data]);
  const all = useMemo(() => (data?.companies ?? []).flatMap((c) => c.openings), [data]);
  const byId = useMemo(() => new Map(all.map((o) => [o.id, o])), [all]);

  const tags = useMemo(() => [...new Set((data?.companies ?? []).flatMap((c) => c.tags))], [data]);
  const prefs = useMemo(() => sortPrefs((data?.companies ?? []).flatMap((c) => c.locations ?? [])), [data]);

  // 職種以外の条件で絞った物（職種カードの件数に使う）
  const base = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return all.filter((o) => {
      const c = companies.get(o.companyId);
      if (!filters.showClosed && statusOf(o) === "closed") return false;
      if (filters.type !== "all" && o.type !== filters.type) return false;
      if (filters.tag !== "all" && !c?.tags.includes(filters.tag)) return false;
      if (filters.pref !== "all" && !openingInPref(o, c?.locations, filters.pref)) return false;
      if (q && !`${c?.name} ${o.title} ${o.summary} ${o.location}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, companies, filters]);

  const counts = useMemo(() => {
    const r = { all: base.length } as Record<Role | "all", number>;
    for (const x of ROLES) r[x] = base.filter((o) => o.roles.includes(x)).length;
    return r;
  }, [base]);

  const shown = useMemo(() => {
    const list = role === "all" ? base : base.filter((o) => o.roles.includes(role));
    const far = 99999;
    const sorters: Record<Filters["sort"], (a: Opening, b: Opening) => number> = {
      deadline: (a, b) => {
        const da = daysUntil(a.deadline), db = daysUntil(b.deadline);
        // 締切済みは後ろ、日付不明はその手前
        const ka = da === null ? far - 1 : da < 0 ? far + -da : da;
        const kb = db === null ? far - 1 : db < 0 ? far + -db : db;
        return ka - kb;
      },
      new: (a, b) => b.firstSeen.localeCompare(a.firstSeen),
      company: (a, b) => (companies.get(a.companyId)?.name ?? "").localeCompare(companies.get(b.companyId)?.name ?? "", "ja"),
    };
    return [...list].sort(sorters[filters.sort]);
  }, [base, role, filters.sort, companies]);

  const stats = useMemo(() => {
    const live = all.filter((o) => statusOf(o) !== "closed");
    return {
      companies: (data?.companies ?? []).filter((c) => c.enabled || c.openings.length).length,
      open: live.length,
      soon: live.filter((o) => {
        const d = daysUntil(o.deadline);
        return d !== null && d >= 0 && d <= 7;
      }).length,
      fresh: all.filter((o) => (daysUntil(o.firstSeen) ?? -99) >= -7 && o.firstSeen <= todayJst()).length,
    };
  }, [all, data]);

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <>
      <Header view={view} favCount={auth.favorites.size} />
      <main className="main">
        {view === "home" && (
          <>
            <Hero stats={stats} updatedAt={data?.updatedAt ?? null} targetYear={data?.targetGraduationYear ?? null} />
            <RolePicker value={role} counts={counts} onChange={setRole} />
            <FilterBar f={filters} set={set} tags={tags} prefs={prefs} resultCount={shown.length} />
            <div className="layout">
              <div className="layout__main">
                {!data && !loadError && <Skeleton />}
                {loadError && <Empty icon="alert" title="データを読み込めませんでした" text="時間をおいて再読み込みしてください。" />}
                {data && all.length === 0 && (
                  <Empty
                    icon="clock"
                    title="ただいまデータを集めています"
                    text="AI が各社の採用ページを確認中です。初回の更新が終わるとここに募集が並びます。監視中の会社は「会社」のページで見られます。"
                    action={<a className="btn btn--ghost" href="#/companies">会社の一覧へ</a>}
                  />
                )}
                {data && all.length > 0 && shown.length === 0 && (
                  <Empty
                    icon="search"
                    title="条件に合う募集がありません"
                    text="絞り込みをゆるめてみてください。"
                    action={
                      <button className="btn btn--ghost" onClick={() => { setFilters(DEFAULT_FILTERS); setRole("all"); }}>
                        条件をリセット
                      </button>
                    }
                  />
                )}
                <div className="cards">
                  {shown.map((o) => {
                    const c = companies.get(o.companyId);
                    return c ? <OpeningCard key={o.id} o={o} company={c} role={role} /> : null;
                  })}
                </div>
              </div>
              <DeadlineRail items={all} companies={companies} />
            </div>
          </>
        )}
        {view === "companies" && <CompanyGrid companies={data?.companies ?? []} />}
        {view === "tracker" && <TrackerView companies={companies} />}
        {view === "favorites" && <FavoritesView openings={byId} companies={companies} />}
        {view === "about" && <About model={data?.model ?? null} targetYear={data?.targetGraduationYear ?? null} />}
      </main>
      <footer className="footer">
        <p>
          掲載内容は AI が各社の公式採用ページから自動で読み取ったものです。誤りがある場合があるため、応募の前に必ず公式ページを確認してください。
        </p>
        <p>
          <a href="https://github.com/wine-5/game-career-hub" target="_blank" rel="noopener noreferrer">GitHub</a>
        </p>
      </footer>
      <LoginModal />
      <GamesModal companies={companies} />
    </>
  );
}

function Empty({ icon, title, text, action }: { icon: IconName; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} size={32} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="cards">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}

export type { CompanyResult };
