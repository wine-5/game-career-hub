import { useAuth } from "../lib/auth.tsx";
import { useTracker, type AppKind } from "../lib/tracker.tsx";
import { Icon } from "./Icon.tsx";

/** この会社の選考を記録し始めるボタン。記録済みなら選考のページへ */
export function TrackButton({ companyId, companyName, kind = "newgrad", title }: {
  companyId: string;
  companyName: string;
  kind?: AppKind;
  title?: string;
}) {
  const auth = useAuth();
  const tracker = useTracker();
  const has = tracker.applications.some((a) => a.companyId === companyId && a.kind === kind);

  const onClick = async () => {
    if (!auth.session) return auth.openLogin();
    if (!has) await tracker.add({ companyId, companyName, kind, title });
    window.location.hash = "#/tracker";
  };

  return (
    <button
      className={`track-btn ${has ? "is-on" : ""}`}
      onClick={onClick}
      title={has ? "選考の記録を見る" : auth.session ? "選考を記録する" : "ログインすると選考を記録できます"}
      aria-label={has ? "選考の記録を見る" : "選考を記録する"}
    >
      <Icon name="tracker" size={17} />
    </button>
  );
}
