import { useAuth } from "../lib/auth.tsx";
import { KIcon } from "./Icons.tsx";

export type View = "home" | "companies" | "favorites" | "about";

const NAV: { view: View; label: string; icon: string }[] = [
  { view: "home", label: "募集一覧", icon: "menuGrid" },
  { view: "companies", label: "会社", icon: "home" },
  { view: "favorites", label: "お気に入り", icon: "star" },
  { view: "about", label: "使い方", icon: "information" },
];

export function Header({ view, favCount }: { view: View; favCount: number }) {
  const auth = useAuth();
  const user = auth.session?.user;
  const name = (user?.user_metadata?.user_name as string | undefined) ?? user?.email ?? "";

  return (
    <header className="header">
      <div className="header__inner">
        <a className="logo" href="#/">
          <span className="logo__mark">
            <KIcon name="gamepad" size={22} color="#0b0d1a" />
          </span>
          <span className="logo__text">
            GAME<b>CAREER</b>HUB
          </span>
        </a>
        <nav className="nav" aria-label="メニュー">
          {NAV.map((n) => (
            <a key={n.view} href={`#/${n.view === "home" ? "" : n.view}`} className={`nav__item ${view === n.view ? "is-active" : ""}`}>
              <KIcon name={n.icon} size={16} />
              <span>{n.label}</span>
              {n.view === "favorites" && favCount > 0 && <span className="nav__badge">{favCount}</span>}
            </a>
          ))}
        </nav>
        <div className="header__auth">
          {user ? (
            <>
              <span className="user-chip" title={name}>
                <KIcon name="unlocked" size={14} />
                <span className="user-chip__name">{name}</span>
              </span>
              <button className="btn btn--ghost btn--sm" onClick={() => auth.signOut()}>
                ログアウト
              </button>
            </>
          ) : (
            <button className="btn btn--primary btn--sm" onClick={auth.openLogin}>
              <KIcon name="locked" size={14} />
              ログイン
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
