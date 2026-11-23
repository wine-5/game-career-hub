import { useState } from "react";
import type { CompanyResult } from "../types.ts";
import { asset } from "../lib/util.ts";

/** 会社のロゴ。無い・読めないときは頭文字を出す */
export function CompanyLogo({ company, size = 40 }: { company: Pick<CompanyResult, "name" | "logo">; size?: number }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  if (!company.logo || broken) {
    return (
      <span className="logo-box logo-box--text" style={{ ...style, fontSize: size * 0.42 }} aria-hidden>
        {company.name.slice(0, 1)}
      </span>
    );
  }
  return (
    <span className="logo-box" style={style}>
      <img src={asset(company.logo)} alt={`${company.name}のロゴ`} loading="lazy" onError={() => setBroken(true)} />
    </span>
  );
}
