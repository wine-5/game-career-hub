import type { CompanyLinks as Links } from "../types.ts";
import { Icon, type IconName } from "./Icon.tsx";

export const LINK_META: Record<keyof Links, { icon: IconName; label: string }> = {
  newgrad: { icon: "graduate", label: "新卒採用ページ" },
  internship: { icon: "internship", label: "インターンページ" },
  philosophy: { icon: "philosophy", label: "企業理念" },
};

/** 新卒・インターン・企業理念のページへのアイコンボタン（登録のある物だけ） */
export function CompanyLinks({ links, hide = [] }: { links?: Links; hide?: (keyof Links)[] }) {
  const items = (Object.keys(LINK_META) as (keyof Links)[]).filter((k) => links?.[k] && !hide.includes(k));
  if (!items.length) return null;
  return (
    <div className="link-icons">
      {items.map((k) => (
        <a
          key={k}
          className={`link-icon link-icon--${k}`}
          href={links![k]}
          target="_blank"
          rel="noopener noreferrer"
          title={LINK_META[k].label}
          aria-label={LINK_META[k].label}
        >
          <Icon name={LINK_META[k].icon} size={18} />
        </a>
      ))}
    </div>
  );
}
