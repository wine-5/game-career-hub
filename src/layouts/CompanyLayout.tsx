import { OpeningCard } from "../components/OpeningCard.tsx";
import type { LayoutProps } from "./types.ts";

/** 会社ごと（仮: 段階 2 で作り込む。いまは募集のカードを並べるだけ） */
export function CompanyLayout({ shown, companies, role, lastRun }: LayoutProps) {
  return (
    <div className="cards">
      {shown.map((o) => {
        const c = companies.get(o.companyId);
        return c ? <OpeningCard key={o.id} o={o} company={c} role={role} lastRun={lastRun} /> : null;
      })}
    </div>
  );
}
