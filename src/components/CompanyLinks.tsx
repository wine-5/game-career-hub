import type { CompanyLinks as Links } from "../types.ts";
import { Icon, type IconName } from "./Icon.tsx";

export const LINK_META: Record<keyof Links, { icon: IconName; label: string; short: string }> = {
  newgrad: { icon: "graduate", label: "新卒採用ページ", short: "新卒採用" },
  internship: { icon: "internship", label: "インターンページ", short: "インターン" },
  salary: { icon: "salary", label: "給与・待遇", short: "給与・待遇" },
  philosophy: { icon: "philosophy", label: "企業理念", short: "企業理念" },
};

/** 新卒・インターン・企業理念のページへのアイコンボタン（登録のある物だけ）。labeled なら文字も付ける */
export function CompanyLinks({ links, hide = [], labeled = false }: { links?: Links; hide?: (keyof Links)[]; labeled?: boolean }) {
  const items = (Object.keys(LINK_META) as (keyof Links)[]).filter((k) => links?.[k] && !hide.includes(k));
  if (!items.length) return null;
  return (
    <div className={`link-icons ${labeled ? "link-icons--labeled" : ""}`}>
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
          <Icon name={LINK_META[k].icon} size={labeled ? 15 : 18} />
          {labeled && <span>{LINK_META[k].short}</span>}
        </a>
      ))}
    </div>
  );
}
