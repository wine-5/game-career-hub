import type { CompanyResult, Opening } from "../types.ts";
import { useAuth } from "../lib/auth.tsx";
import { KIcon, Vfx } from "./Icons.tsx";
import { OpeningCard } from "./OpeningCard.tsx";

export function FavoritesView({ openings, companies }: {
  openings: Map<string, Opening>;
  companies: Map<string, CompanyResult>;
}) {
  const auth = useAuth();

  if (!auth.session) {
    return (
      <section className="section">
        <div className="gate">
          <Vfx name="hex_shield" color="var(--c-planner)" className="gate__fx" />
          <KIcon name="locked" size={40} color="var(--c-planner)" />
          <h2>お気に入りはログインすると使えます</h2>
          <p>気になる募集に ★ を付けておくと、ここにまとめて表示されます。</p>
          <button className="btn btn--primary" onClick={auth.openLogin}>ログインする</button>
        </div>
      </section>
    );
  }

  const favs = [...auth.favorites.entries()].sort((a, b) => b[1].createdAt.localeCompare(a[1].createdAt));
  const alive = favs.filter(([id]) => openings.has(id));
  const gone = favs.filter(([id]) => !openings.has(id));

  return (
    <section className="section">
      <div className="section__head">
        <h2 className="section__title">
          <KIcon name="star" size={20} color="var(--c-planner)" /> お気に入り
          <span className="count-pill">{favs.length}</span>
        </h2>
      </div>
      {favs.length === 0 && <p className="section__lead">まだありません。募集カードの ★ を押すと追加されます。</p>}
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
