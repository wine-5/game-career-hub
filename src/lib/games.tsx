// 会社ごとの作品（public/data/games.json）を読み、作品一覧の窓を開け閉めする。
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CompanyGames, GamesData } from "../types.ts";

interface GamesState {
  get: (companyId: string) => CompanyGames | undefined;
  openFor: string | null;
  open: (companyId: string) => void;
  close: () => void;
}

const Ctx = createContext<GamesState | null>(null);

export function GamesProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<GamesData | null>(null);
  const [openFor, setOpenFor] = useState<string | null>(null);

  useEffect(() => {
    // 一覧の表示を先に出したいので、作品のデータは後から読む
    fetch(`${import.meta.env.BASE_URL}data/games.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? (r.json() as Promise<GamesData>) : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const value = useMemo<GamesState>(
    () => ({
      get: (id) => data?.companies[id],
      openFor,
      open: setOpenFor,
      close: () => setOpenFor(null),
    }),
    [data, openFor],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGames(): GamesState {
  const v = useContext(Ctx);
  if (!v) throw new Error("GamesProvider の外で useGames が呼ばれた");
  return v;
}
