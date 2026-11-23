import type { CompanyResult, Opening } from "../types.ts";
import { useAuth } from "../lib/auth.tsx";
import { Icon } from "./Icon.tsx";
import { OpeningCard } from "./OpeningCard.tsx";
import { CompanyCard } from "./CompanyGrid.tsx";
import { statusOf } from "../lib/util.ts";

export function FavoritesView({ openings, companies }: {
  openings: Map<string, Opening>;
  companies: Map<string, CompanyResult>;
}) {
  const auth = useAuth();

  if (!auth.session) {
    return (
      <section className="section">
        <div className="gate">
          <Icon name="lock" size={32} />
          <h2>お気に入りはログインすると使えます</h2>
          <p>気になる募集に ☆ を付けておくと、ここにまとめて表示されます。</p>
          <button className="btn btn--primary" onClick={auth.openLogin}>ログインする</button>
        </div>
      </section>
    );
  }

  const all = [...auth.favorites.entries()].sort((a, b) => b[1].createdAt.localeCompare(a[1].createdAt));
  // 会社のお気に入りは「company:<id>」のキーで入っている
  const favCompanies = all.filter(([id]) => id.startsWith("company:")).map(([id]) => companies.get(id.slice(8))).filter((c): c is CompanyResult => Boolean(c));
  const favs = all.filter(([id]) => !id.startsWith("company:"));
  const alive = favs.filter(([id]) => openings.has(id));
  const gone = favs.filter(([id]) => !openings.has(id));

  return (
    <section className="section">
      <div className="section__head">
        <h2 className="section__title">
          <Icon name="star" size={20} /> お気に入り
          <span className="count-pill">{all.length}</span>
        </h2>
      </div>
      {all.length === 0 && <p className="section__lead">まだありません。募集カードや会社カードの ☆ を押すと追加されます。</p>}
      {favCompanies.length > 0 && (
        <>
          <h3 className="subhead">会社 <span className="count-pill">{favCompanies.length}</span></h3>
          <div className="company-grid">
            {favCompanies.map((c) => (
              <CompanyCard key={c.id} c={c} open={c.openings.filter((o) => statusOf(o) !== "closed").length} />
            ))}
          </div>
        </>
      )}
      {favs.length > 0 && favCompanies.length > 0 && <h3 className="subhead">募集 <span className="count-pill">{favs.length}</span></h3>}
      <div className="cards">
        {alive.map(([id]) => {
          const o = openings.get(id)!;
          const c = companies.get(o.companyId);
          return c ? <OpeningCard key={id} o={o} company={c} /> : null;
        })}
      </div>
      {gone.length > 0 && (
        <>
          <h3 className="subhead">掲載が終わった募集</h3>
          <ul className="gone">
            {gone.map(([id, m]) => (
              <li key={id}>
                <span>{m.company} — {m.title}</span>
                <button className="btn btn--ghost btn--sm" onClick={() => auth.toggleFavorite(id, m)}>外す</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
