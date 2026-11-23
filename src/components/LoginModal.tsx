import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth.tsx";
import { Icon } from "./Icon.tsx";

export function LoginModal() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (auth.session) auth.closeLogin();
  }, [auth.session]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && auth.closeLogin();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [auth]);

  if (!auth.loginOpen) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="login-title" onClick={auth.closeLogin}>
      <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={auth.closeLogin} aria-label="閉じる">
          <Icon name="x" size={18} />
        </button>
        <h2 id="login-title" className="modal__title">ログイン</h2>
        <p className="modal__lead">
          募集の閲覧にログインは要りません。<b>お気に入り</b>や<b>選考の記録</b>を保存するときだけログインしてください。
        </p>

        {auth.configured ? (
          <div className="login">
            {auth.providers.github && (
              <button className="btn btn--github btn--block" onClick={() => auth.signInWith("github")}>
                GitHub でログイン
              </button>
            )}
            {auth.providers.google && (
              <button className="btn btn--google btn--block" onClick={() => auth.signInWith("google")}>
                Google でログイン
              </button>
            )}
            {(auth.providers.github || auth.providers.google) && <div className="login__or"><span>または</span></div>}
            <form
              className="login__email"
              onSubmit={async (e) => {
                e.preventDefault();
                const err = await auth.signInWithEmail(email);
                setMsg(err ?? "ログイン用のリンクをメールで送りました。メールを開いてリンクを押してください。");
              }}
            >
              <input type="email" required placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="btn btn--primary" type="submit">リンクを送る</button>
            </form>
            {msg && <p className="login__msg">{msg}</p>}
          </div>
        ) : (
          <div className="notice">
            <Icon name="info" size={18} />
            <p>ログイン機能はまだ準備中です（管理者が Supabase を設定すると使えるようになります）。</p>
          </div>
        )}
      </div>
    </div>
  );
}
