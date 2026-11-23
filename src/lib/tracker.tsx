// 選考の記録（どの会社に応募して、いまどの段階か・何を出したか）。ログインした本人だけが読み書きできる。
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "./supabase.ts";
import { useAuth } from "./auth.tsx";

export type Outcome = "active" | "done" | "offer" | "rejected" | "declined";
export type AppKind = "newgrad" | "internship" | "other";

export interface Step {
  name: string;
  /** 予定日・実施日（YYYY-MM-DD） */
  date?: string;
  done: boolean;
}

export interface SubmittedDoc {
  kind: string;
  title: string;
  date?: string;
  /** 提出した物の置き場（Google ドライブなど） */
  url?: string;
  /** 書いた内容の控え・メモ */
  note?: string;
}

export interface Application {
  id: string;
  companyId: string;
  companyName: string;
  kind: AppKind;
  title: string;
  outcome: Outcome;
  steps: Step[];
  documents: SubmittedDoc[];
  memo: string;
  createdAt: string;
  updatedAt: string;
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  active: "選考中",
  done: "参加済み・完了",
  offer: "内定",
  rejected: "お見送り",
  declined: "辞退",
};

export const KIND_LABEL: Record<AppKind, string> = {
  newgrad: "新卒",
  internship: "インターン",
  other: "その他",
};

export const DOC_KINDS = ["ES", "履歴書", "ポートフォリオ", "作品・課題", "Webテスト", "成績・卒業見込証明書", "その他"];

/** 応募を作ったときの選考の流れ（あとで自由に足したり消したりできる） */
export const DEFAULT_STEPS: Record<AppKind, string[]> = {
  newgrad: ["エントリー", "書類選考（ES・作品）", "適性検査", "一次面接", "二次面接", "最終面接", "内定"],
  internship: ["エントリー", "書類選考", "面接", "参加"],
  other: ["申し込み", "参加"],
};

/** いま進んでいる段階（まだ終わっていない最初の段階）。全部終わっていれば最後 */
export function currentStepIndex(a: Application): number {
  const i = a.steps.findIndex((s) => !s.done);
  return i === -1 ? a.steps.length - 1 : i;
}

/** 次の予定（終わっていない段階のうち日付が入っている最初の物） */
export function nextEvent(a: Application): Step | undefined {
  return a.steps.find((s) => !s.done && s.date);
}

interface NewApplication {
  companyId: string;
  companyName: string;
  kind: AppKind;
  title?: string;
  /** 終わった物（参加済みのインターンなど）をあとから記録するときに選ぶ */
  outcome?: Outcome;
}

interface TrackerState {
  ready: boolean;
  applications: Application[];
  add: (a: NewApplication) => Promise<string | null>;
  update: (id: string, patch: Partial<Omit<Application, "id" | "createdAt">>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const Ctx = createContext<TrackerState | null>(null);

type Row = {
  id: string;
  company_id: string;
  company_name: string;
  kind: AppKind;
  title: string;
  outcome: Outcome;
  steps: Step[];
  documents: SubmittedDoc[];
  memo: string;
  created_at: string;
  updated_at: string;
};

const fromRow = (r: Row): Application => ({
  id: r.id,
  companyId: r.company_id,
  companyName: r.company_name,
  kind: r.kind,
  title: r.title,
  outcome: r.outcome,
  steps: r.steps ?? [],
  documents: r.documents ?? [],
  memo: r.memo ?? "",
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toRow = (p: Partial<Application>) => {
  const r: Record<string, unknown> = {};
  if (p.companyId !== undefined) r.company_id = p.companyId;
  if (p.companyName !== undefined) r.company_name = p.companyName;
  if (p.kind !== undefined) r.kind = p.kind;
  if (p.title !== undefined) r.title = p.title;
  if (p.outcome !== undefined) r.outcome = p.outcome;
  if (p.steps !== undefined) r.steps = p.steps;
  if (p.documents !== undefined) r.documents = p.documents;
  if (p.memo !== undefined) r.memo = p.memo;
  return r;
};

export function TrackerProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase || !session) {
      setApplications([]);
      setReady(false);
      return;
    }
    supabase
      .from("applications")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setApplications(((data ?? []) as Row[]).map(fromRow));
        setReady(true);
      });
  }, [session]);

  const add = useCallback(
    async (a: NewApplication) => {
      if (!supabase || !session) return null;
      const outcome = a.outcome ?? "active";
      // 参加済み・内定で記録したときは、段階を全部「済み」にしておく
      const finished = outcome === "done" || outcome === "offer";
      const steps: Step[] = DEFAULT_STEPS[a.kind].map((name) => ({ name, done: finished }));
      const { data, error } = await supabase
        .from("applications")
        .insert(toRow({ ...a, title: a.title ?? "", steps, documents: [], memo: "", outcome }))
        .select("*")
        .single();
      if (error || !data) {
        console.error(error);
        return null;
      }
      const created = fromRow(data as Row);
      setApplications((prev) => [created, ...prev]);
      return created.id;
    },
    [session],
  );

  const update = useCallback<TrackerState["update"]>(async (id, patch) => {
    if (!supabase) return;
    const now = new Date().toISOString();
    let before: Application | undefined;
    // 先に画面を変えてから保存する（失敗したら戻す）
    setApplications((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        before = a;
        return { ...a, ...patch, updatedAt: now };
      }),
    );
    const { error } = await supabase.from("applications").update({ ...toRow(patch), updated_at: now }).eq("id", id);
    if (error) {
      console.error(error);
      if (before) setApplications((prev) => prev.map((a) => (a.id === id ? before! : a)));
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) return console.error(error);
    setApplications((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const value = useMemo(() => ({ ready, applications, add, update, remove }), [ready, applications, add, update, remove]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTracker(): TrackerState {
  const v = useContext(Ctx);
  if (!v) throw new Error("TrackerProvider の外で useTracker が呼ばれた");
  return v;
}
