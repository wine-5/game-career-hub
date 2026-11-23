import { useState } from "react";
import type { CompanyResult } from "../types.ts";
import { asset } from "../lib/util.ts";

/** 会社のロゴ。無い・読めないときは頭文字を出す。href があれば押すとそのページ（公式サイト）を開く */
export function CompanyLogo({ company, size = 40, href }: { company: Pick<CompanyResult, "name" | "logo">; size?: number; href?: string }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  const inner =
    !company.logo || broken ? (
      <span className="logo-box logo-box--text" style={{ ...style, fontSize: size * 0.42 }} aria-hidden>
        {company.name.slice(0, 1)}
      </span>
    ) : (
      <span className="logo-box" style={style}>
        <img src={asset(company.logo)} alt={`${company.name}のロゴ`} loading="lazy" onError={() => setBroken(true)} />
      </span>
    );
  if (!href) return inner;
  return (
    <a className="logo-link" href={href} target="_blank" rel="noopener noreferrer" title={`${company.name}の公式サイト`} aria-label={`${company.name}の公式サイト`}>
      {inner}
    </a>
  );
}
