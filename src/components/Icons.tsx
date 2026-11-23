import type { CSSProperties, ReactElement } from "react";
import type { Role } from "../types.ts";
import { asset } from "../lib/util.ts";

/** Kenney の白いアイコンを、色を付けて表示する（CSS の mask で色を乗せる） */
export function KIcon({ name, size = 20, color = "currentColor", className = "" }: {
  name: string; size?: number; color?: string; className?: string;
}) {
  const style = {
    "--mask": `url(${asset(`icons/${name}.png`)})`,
    width: size,
    height: size,
    background: color,
  } as CSSProperties;
  return <span className={`kicon ${className}`} style={style} aria-hidden />;
}

/** WineEngine で作ったエフェクトの絵を、色を付けて光らせる */
export function Vfx({ name, color, className = "", style }: {
  name: string; color: string; className?: string; style?: CSSProperties;
}) {
  const s = { "--mask": `url(${asset(`vfx/${name}.png`)})`, background: color, ...style } as CSSProperties;
  return <span className={`vfx ${className}`} style={s} aria-hidden />;
}

const PATHS: Record<Role, ReactElement> = {
  programmer: (
    <>
      <path d="M8 7 3 12l5 5M16 7l5 5-5 5" />
      <path d="M14 4 10 20" />
    </>
  ),
  planner: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  effect: (
    <>
      <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
      <path d="m5 5 3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19" />
      <circle cx="12" cy="12" r="2.2" />
    </>
  ),
  artist: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.6-1.6-1.8-1.6-3.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4-4-7-9-7Z" />
      <circle cx="7.5" cy="11" r="1.2" />
      <circle cx="10" cy="7" r="1.2" />
      <circle cx="15" cy="7.5" r="1.2" />
    </>
  ),
  other: (
    <>
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </>
  ),
};

export function RoleIcon({ role, size = 22 }: { role: Role; size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden
    >
      {PATHS[role]}
    </svg>
  );
}
