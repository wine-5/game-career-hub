import { useEffect } from "react";
import { LAYOUTS, THEMES, type LayoutId, type ThemeId } from "../lib/uiPrefs.ts";
import { Icon } from "./Icon.tsx";

/** 表示スタイルとテーマを選ぶ窓。選ぶとすぐ反映する（閉じなくてよい） */
export function DisplaySettings({ open, onClose, layout, setLayout, theme, setTheme }: {
  open: boolean;
  onClose: () => void;
  layout: LayoutId;
  setLayout: (l: LayoutId) => void;
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="display-title" onClick={onClose}>
      <div className="modal__panel modal__panel--wide display-settings" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose} aria-label="閉じる">
          <Icon name="x" size={18} />
        </button>
        <h2 id="display-title" className="modal__title">表示の設定</h2>

        <section className="display-settings__group">
          <h3 className="display-settings__head">表示スタイル</h3>
          <div className="opt-grid" role="radiogroup" aria-label="表示スタイル">
            {LAYOUTS.map((l) => (
              <button key={l.id} role="radio" aria-checked={layout === l.id} className={`opt ${layout === l.id ? "is-on" : ""}`} onClick={() => setLayout(l.id)}>
                <span className="opt__label">{l.label}</span>
                <span className="opt__desc">{l.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="display-settings__group">
          <h3 className="display-settings__head">テーマ</h3>
          <div className="opt-grid" role="radiogroup" aria-label="テーマ">
            {THEMES.map((t) => (
              <button key={t.id} role="radio" aria-checked={theme === t.id} className={`opt ${theme === t.id ? "is-on" : ""}`} onClick={() => setTheme(t.id)}>
                <span className="opt__label">
                  <span className="swatch" aria-hidden>
                    {t.swatch.map((c, i) => (
                      <i key={i} style={{ background: c }} />
                    ))}
                  </span>
                  {t.label}
                </span>
                <span className="opt__desc">{t.desc}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
