// 表示スタイルとカラーテーマの設定（端末に保存する）
import { useCallback, useEffect, useState } from "react";

export type LayoutId = "classic" | "tidy" | "company" | "timeline" | "list";
export type ThemeId = "system" | "light" | "slate" | "ink" | "midnight" | "paper";

export const LAYOUTS: { id: LayoutId; label: string; desc: string }[] = [
  { id: "classic", label: "いまの表示", desc: "これまでのカード一覧" },
  { id: "tidy", label: "すっきりカード", desc: "絞り込みを 1 つのボタンに。カードは要点だけで、詳しくは開いて見る" },
  { id: "company", label: "会社ごと", desc: "会社の下にその会社の募集を並べる" },
  { id: "timeline", label: "日付順", desc: "締切・受付開始の近い順に、今週・今月…と区切って並べる" },
  { id: "list", label: "一覧＋詳細", desc: "1 行 1 件で見渡し、押すと詳細を出す" },
];

/** swatch は [bg, surface, accent, text]（見本の丸に使う） */
export const THEMES: { id: ThemeId; label: string; desc: string; swatch: [string, string, string, string] }[] = [
  { id: "system", label: "端末に合わせる", desc: "明るい設定ならライト、暗い設定ならスレート", swatch: ["#f5f6f8", "#0f1216", "#3157d5", "#8aa4ff"] },
  { id: "light", label: "ライト", desc: "白地に青", swatch: ["#f5f6f8", "#ffffff", "#3157d5", "#1c2230"] },
  { id: "paper", label: "ペーパー", desc: "目にやさしい生成りの白", swatch: ["#f3f1ec", "#fbfaf7", "#3d5a99", "#24221e"] },
  { id: "slate", label: "スレート", desc: "青みのある落ち着いたダーク", swatch: ["#0f1216", "#171b21", "#8aa4ff", "#e6e9ee"] },
  { id: "ink", label: "墨", desc: "暖かいグレーと琥珀色のダーク", swatch: ["#141312", "#1c1b19", "#e0a458", "#ece8e1"] },
  { id: "midnight", label: "ミッドナイト", desc: "紺と紫のゲームらしいダーク", swatch: ["#0b0d1a", "#12152a", "#8b7bff", "#e8e9ff"] },
];

const LAYOUT_KEY = "gch.layout";
const THEME_KEY = "gch.theme";

const isLayout = (v: unknown): v is LayoutId => LAYOUTS.some((l) => l.id === v);
const isTheme = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 保存できない環境では覚えないだけ */
  }
}

/** URL の ?ui= / ?theme= があれば優先する（共有・試し用） */
function readParam(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

/** <html> の data-theme と theme-color を合わせる（system のときは属性を外す） */
function applyTheme(theme: ThemeId) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  // 色は CSS の反映後に読む
  requestAnimationFrame(() => {
    const color = getComputedStyle(root).getPropertyValue("--surface").trim();
    if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  });
}

function initialLayout(): LayoutId {
  const fromUrl = readParam("ui");
  if (isLayout(fromUrl)) {
    writeStored(LAYOUT_KEY, fromUrl);
    return fromUrl;
  }
  const saved = readStored(LAYOUT_KEY);
  return isLayout(saved) ? saved : "classic";
}

function initialTheme(): ThemeId {
  const fromUrl = readParam("theme");
  if (isTheme(fromUrl)) {
    writeStored(THEME_KEY, fromUrl);
    return fromUrl;
  }
  const saved = readStored(THEME_KEY);
  return isTheme(saved) ? saved : "system";
}

export function useUiPrefs(): { layout: LayoutId; setLayout: (l: LayoutId) => void; theme: ThemeId; setTheme: (t: ThemeId) => void } {
  const [layout, setLayoutState] = useState<LayoutId>(initialLayout);
  const [theme, setThemeState] = useState<ThemeId>(initialTheme);

  // 最初の描画後に、保存されている（または URL で指定された）テーマを当てる
  useEffect(() => {
    applyTheme(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setLayout = useCallback((l: LayoutId) => {
    setLayoutState(l);
    writeStored(LAYOUT_KEY, l);
  }, []);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    writeStored(THEME_KEY, t);
    applyTheme(t);
  }, []);

  return { layout, setLayout, theme, setTheme };
}
