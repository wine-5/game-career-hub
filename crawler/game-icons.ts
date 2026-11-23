// public/data/games.json の作品のうち、アイコンの無い物を作品名で探して埋める。
//   1. Steam のストア検索（PC で出ている作品）
//   2. App Store の検索（スマホで出ている作品。回数制限が厳しいので 1 社 2 本まで）
// 会社カードに並ぶのは上位の数本なので、会社ごとに上位 TOP 本だけを調べる。
//
//   npm run game-icons                 まだ調べていない作品だけ
//   npm run game-icons -- --only=sega  指定した会社だけ
import path from "node:path";
import type { GameItem, GamesData } from "../src/types.ts";
import { USER_AGENT, sleep } from "./fetch.ts";
import { parseArgs, readJson, ROOT, writeJson } from "./shared.ts";

const OUT = path.join(ROOT, "public/data/games.json");
const TOP = 8;
const ITUNES_PER_COMPANY = 2;
const { only } = parseArgs(process.argv.slice(2));

/** 記号・空白・全角半角の違いを無くして比べる */
const fold = (s: string) =>
  s.normalize("NFKC").toLowerCase().replace(/[\s:：・\-‐―~〜!！?？'’"“”.,、。()（）「」『』【】\[\]™®]/g, "");

function sameTitle(a: string, b: string) {
  const x = fold(a), y = fold(b);
  if (!x || !y) return false;
  if (x === y) return true;
  // 片方が副題つきなど（短いほうが 4 文字以上で、長いほうの頭に一致）
  const [s, l] = x.length < y.length ? [x, y] : [y, x];
  return s.length >= 4 && l.startsWith(s) && s.length / l.length > 0.5;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
    if (res.status === 429) {
      await sleep(30_000);
      return null;
    }
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

let lastSteam = 0;
async function steamIcon(title: string): Promise<Partial<GameItem> | null> {
  const wait = lastSteam + 1300 - Date.now();
  if (wait > 0) await sleep(wait);
  lastSteam = Date.now();
  const r = await getJson<{ items: { id: number; name: string; tiny_image: string }[] }>(
    `https://store.steampowered.com/api/storesearch/?l=japanese&cc=JP&term=${encodeURIComponent(title)}`,
  );
  const hit = r?.items.find((x) => sameTitle(x.name, title));
  if (!hit) return null;
  return {
    icon: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${hit.id}/capsule_231x87.jpg`,
    iconShape: "wide",
    url: `https://store.steampowered.com/app/${hit.id}/`,
  };
}

let lastItunes = 0;
async function appStoreIcon(title: string): Promise<Partial<GameItem> | null> {
  const wait = lastItunes + 3200 - Date.now();
  if (wait > 0) await sleep(wait);
  lastItunes = Date.now();
  const r = await getJson<{ results: { trackName: string; primaryGenreName: string; artworkUrl100: string; trackViewUrl: string }[] }>(
    `https://itunes.apple.com/search?country=jp&entity=software&limit=5&term=${encodeURIComponent(title)}`,
  );
  const hit = r?.results.find((x) => x.primaryGenreName === "Games" && sameTitle(x.trackName, title));
  if (!hit) return null;
  return { icon: hit.artworkUrl100.replace("100x100bb", "128x128bb"), iconShape: "square", url: hit.trackViewUrl.split("?")[0] };
}

type Tried = GameItem & { iconTried?: boolean };

const data = await readJson<GamesData>(OUT, { updatedAt: null, companies: {} });
const ids = Object.keys(data.companies).filter((id) => !only || only.includes(id));
let found = 0, done = 0;

for (const id of ids) {
  const games = data.companies[id].games as Tried[];
  // 会社カードに出る順（アイコンの有無に関係なくよく知られている順）の上位だけ
  const targets = [...games].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, TOP).filter((g) => !g.icon && !g.iconTried);
  let itunes = 0;
  for (const g of targets) {
    let got = await steamIcon(g.title);
    if (!got && itunes < ITUNES_PER_COMPANY) {
      itunes++;
      got = await appStoreIcon(g.title);
    }
    g.iconTried = true;
    if (got) {
      // 記事（Wikipedia）へのリンクがあればそちらを残す
      Object.assign(g, got, g.url && /wikipedia/.test(g.url) ? { url: g.url } : {});
      found++;
    }
  }
  if (targets.length) console.log(`- ${id}: ${targets.length} 本を調べた / アイコン ${targets.filter((g) => g.icon).length} 本`);
  if (++done % 25 === 0) {
    await writeJson(OUT, data);
    console.log(`== ${done}/${ids.length} 社 / 見つけた ${found} 本 ==`);
  }
}
await writeJson(OUT, { ...data, updatedAt: new Date().toISOString() });
console.log(`完了: アイコンを ${found} 本見つけた`);
