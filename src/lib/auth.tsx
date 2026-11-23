// ログインの状態とお気に入りを扱う。閲覧はログイン不要、お気に入りだけログインが要る。
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase.ts";

export interface FavoriteMeta {
  title: string;
  company: string;
}

interface AuthState {
  /** ログインの仕組みが設定されているか */
  configured: boolean;
  session: Session | null;
  favorites: Map<string, FavoriteMeta & { createdAt: string }>;
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  signInWith: (provider: "github" | "google") => Promise<void>;
  signInWithEmail: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  /** ログインしていなければログイン画面を開く */
  toggleFavorite: (id: string, meta: FavoriteMeta) => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [favorites, setFavorites] = useState<AuthState["favorites"]>(new Map());
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session) {
      setFavorites(new Map());
      return;
    }
    supabase
      .from("favorites")
      .select("opening_id, title, company, created_at")
      .then(({ data, error }) => {
        if (error) return console.error(error);
        setFavorites(
          new Map(
            (data ?? []).map((r) => [
              r.opening_id as string,
              { title: r.title as string, company: r.company as string, createdAt: r.created_at as string },
            ]),
          ),
        );
      });
  }, [session]);

  const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;

  const signInWith = useCallback(
    async (provider: "github" | "google") => {
      await supabase?.auth.signInWithOAuth({ provider, options: { redirectTo } });
    },
    [redirectTo],
  );

  const signInWithEmail = useCallback(
    async (email: string) => {
      if (!supabase) return "ログインが設定されていません";
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      return error ? error.message : null;
    },
    [redirectTo],
  );

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const toggleFavorite = useCallback(
    async (id: string, meta: FavoriteMeta) => {
      if (!supabase || !session) {
        setLoginOpen(true);
        return;
      }
      const has = favorites.has(id);
      // 先に画面を変えてから保存する（失敗したら戻す）
      setFavorites((prev) => {
        const next = new Map(prev);
        if (has) next.delete(id);
        else next.set(id, { ...meta, createdAt: new Date().toISOString() });
        return next;
      });
      const { error } = has
        ? await supabase.from("favorites").delete().eq("opening_id", id)
        : await supabase.from("favorites").insert({ opening_id: id, title: meta.title, company: meta.company });
      if (error) {
        console.error(error);
        setFavorites((prev) => {
          const next = new Map(prev);
          if (has) next.set(id, { ...meta, createdAt: new Date().toISOString() });
          else next.delete(id);
          return next;
        });
      }
    },
    [session, favorites],
  );

  const value = useMemo<AuthState>(
    () => ({
      configured: Boolean(supabase),
      session,
      favorites,
      loginOpen,
      openLogin: () => setLoginOpen(true),
      closeLogin: () => setLoginOpen(false),
      signInWith,
      signInWithEmail,
      signOut,
      toggleFavorite,
    }),
    [session, favorites, loginOpen, signInWith, signInWithEmail, signOut, toggleFavorite],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider の外で useAuth が呼ばれた");
  return v;
}
