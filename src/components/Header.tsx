import { useAuth } from "../lib/auth.tsx";
import { Icon, type IconName } from "./Icon.tsx";

export type View = "home" | "companies" | "favorites" | "about";

const NAV: { view: View; label: string; icon: IconName }[] = [
  { view: "home", label: "募集一覧", icon: "list" },
  { view: "companies", label: "会社", icon: "building" },
  { view: "favorites", label: "お気に入り", icon: "star" },
  { view: "about", label: "使い方", icon: "info" },
];

export function Header({ view, favCount }: { view: View; favCount: number }) {
  const auth = useAuth();
  const user = auth.session?.user;
  const name = (user?.user_metadata?.user_name as string | undefined) ?? user?.email ?? "";

  return (
    <header className="header">
      <div className="header__inner">
        <a className="brand" href="#/">
          <span className="brand__mark">
            <Icon name="graduate" size={18} />
          </span>
          Game Career Hub
        </a>
        <nav className="nav" aria-label="メニュー">
          {NAV.map((n) => (
            <a
              key={n.view}
              href={`#/${n.view === "home" ? "" : n.view}`}
              className={`nav__item ${view === n.view ? "is-active" : ""}`}
              aria-current={view === n.view ? "page" : undefined}
            >
              <Icon name={n.icon} size={16} />
              <span>{n.label}</span>
              {n.view === "favorites" && favCount > 0 && <span className="nav__badge">{favCount}</span>}
            </a>
          ))}
        </nav>
        <div className="header__auth">
          {user ? (
            <>
              <span className="user-chip" title={name}>
                <Icon name="user" size={15} />
                <span>{name}</span>
              </span>
              <button className="btn btn--ghost btn--sm" onClick={() => auth.signOut()}>
                ログアウト
              </button>
            </>
          ) : (
            <button className="btn btn--ghost btn--sm" onClick={auth.openLogin}>
              <Icon name="lock" size={14} />
              ログイン
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
