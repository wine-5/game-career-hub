// 会社ごとの「作った・関わったゲーム」を集めて public/data/games.json に書く。
//   - Wikidata: 開発（P178）・発売（P123）にその会社が入っているゲーム。発売日と Wikipedia の記事も
//   - App Store（iTunes Search API）: その会社が出しているスマホのゲームとアイコン
//   - アイコンが無いゲームは、Steam に出ていれば Steam の画像を使う
//
//   npm run games                 まだ調べていない会社だけ
//   npm run games -- --only=sega  指定した会社だけ
//   npm run games -- --force      全部調べ直す
import path from "node:path";
import type { CompanyEntry, CompanyGames, GameItem, GamesData } from "../src/types.ts";
import { USER_AGENT, sleep } from "./fetch.ts";
import { loadCompanyList, parseArgs, readJson, ROOT, writeJson } from "./shared.ts";

const OUT = path.join(ROOT, "public/data/games.json");
const { force, only } = parseArgs(process.argv.slice(2));
const MAX_GAMES = 60;

async function getJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { ...init, headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...init.headers }, signal: AbortSignal.timeout(65_000) });
    if (res.ok) return (await res.json()) as T;
    if (res.status === 429 || res.status >= 500) {
      await sleep(5000 * (i + 1));
      continue;
    }
    throw new Error(`${res.status} ${url}`);
  }
  throw new Error(`retry over ${url}`);
}

const norm = (s: string) =>
  s.normalize("NFKC").toLowerCase().replace(/株式会社|有限会社|合同会社|\(株\)|inc\.?|co\.?,? ?ltd\.?|corporation|corp\.?|limited|ltd\.?|games?|studios?|entertainment|[\s.,・'’\-‐]/g, "");
const host = (u?: string) => {
  try {
    return u ? new URL(u).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
};
/** 登録ドメイン（sega.co.jp / sega.jp などを同じ会社と見るため、最後の 2〜3 段） */
const baseDomain = (h: string) => h.split(".").slice(/\.(co|ne|or)\.jp$/.test(h) ? -3 : -2).join(".");

// ---------- Wikidata ----------
type Entity = { id: string; labels?: Record<string, { value: string }>; descriptions?: Record<string, { value: string }>; claims?: Record<string, { mainsnak: { datavalue?: { value: unknown } } }[]> };

async function findCompanyQid(c: CompanyEntry): Promise<{ qid: string; en?: string } | null> {
  const name = c.name.replace(/（.*?）|\(.*?\)/g, "").trim();
  const s = await getJson<{ search: { id: string }[] }>(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=ja&uselang=ja&type=item&limit=6&search=${encodeURIComponent(name)}`,
  );
  if (!s.search.length) return null;
  const ids = s.search.map((x) => x.id).join("|");
  const e = await getJson<{ entities: Record<string, Entity> }>(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|descriptions|claims&languages=ja|en&ids=${ids}`,
  );
  const siteHosts = [host(c.site), host(c.url)].filter(Boolean).map(baseDomain);
  let fallback: { qid: string; en?: string } | null = null;
  for (const id of s.search.map((x) => x.id)) {
    const ent = e.entities[id];
    if (!ent) continue;
    const en = ent.labels?.en?.value;
    const sites = (ent.claims?.P856 ?? []).map((x) => baseDomain(host(String(x.mainsnak.datavalue?.value ?? ""))));
    // 公式サイトのドメインが一致すれば確実
    if (sites.some((h) => siteHosts.includes(h))) return { qid: id, en };
    // ドメインが無いときは「ゲーム会社」と説明されていて、名前が一致する物だけ
    const desc = `${ent.descriptions?.ja?.value ?? ""} ${ent.descriptions?.en?.value ?? ""}`;
    const label = ent.labels?.ja?.value ?? en ?? "";
    if (!fallback && /game|ゲーム/i.test(desc) && /company|developer|publisher|studio|企業|会社|開発/i.test(desc) && norm(label) === norm(name)) {
      fallback = { qid: id, en };
    }
  }
  return fallback;
}

type Binding = Record<string, { value: string } | undefined>;

async function wikidataGames(qid: string): Promise<GameItem[]> {
  const q = `SELECT ?g (SAMPLE(?lj) AS ?ja_) (SAMPLE(?le) AS ?en_) (MIN(?d) AS ?date) (SAMPLE(?ja) AS ?jaw) (SAMPLE(?enw) AS ?enwiki)
    (SAMPLE(?st) AS ?steam) (MAX(?n) AS ?links) (GROUP_CONCAT(DISTINCT ?r) AS ?roles) WHERE {
    { ?g wdt:P178 wd:${qid} . BIND("dev" AS ?r) } UNION { ?g wdt:P123 wd:${qid} . BIND("pub" AS ?r) }
    ?g wdt:P31 wd:Q7889 ; wikibase:sitelinks ?n .
    OPTIONAL { ?g wdt:P577 ?d } OPTIONAL { ?g wdt:P1733 ?st }
    OPTIONAL { ?g rdfs:label ?lj FILTER(LANG(?lj) = "ja") } OPTIONAL { ?g rdfs:label ?le FILTER(LANG(?le) = "en") }
    OPTIONAL { ?ja schema:about ?g; schema:isPartOf <https://ja.wikipedia.org/> }
    OPTIONAL { ?enw schema:about ?g; schema:isPartOf <https://en.wikipedia.org/> }
  } GROUP BY ?g ORDER BY DESC(?links) LIMIT ${MAX_GAMES}`;
  const r = await getJson<{ results: { bindings: Binding[] } }>(`https://query.wikidata.org/sparql?query=${encodeURIComponent(q)}`, {
    headers: { Accept: "application/sparql-results+json" },
  });
  return r.results.bindings
    .filter((b) => b.ja_ || b.en_)
    .map((b) => {
      const dev = Boolean(b.roles?.value.includes("dev"));
      const pub = Boolean(b.roles?.value.includes("pub"));
      const steam = b.steam?.value;
      return {
        title: (b.ja_ ?? b.en_)!.value,
        year: b.date?.value ? Number(b.date.value.slice(0, 4)) : undefined,
        role: dev && pub ? "both" : dev ? "dev" : "pub",
        url: b.jaw?.value ?? b.enwiki?.value ?? (steam ? `https://store.steampowered.com/app/${steam}/` : undefined),
        icon: steam ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${steam}/capsule_231x87.jpg` : undefined,
        iconShape: steam ? "wide" : undefined,
        // 開発した作品を、発売だけの作品より前に出す
        score: Number(b.links?.value ?? 0) + (dev ? 40 : 0),
      } satisfies GameItem;
    });
}

// ---------- App Store ----------
type ItunesApp = { trackName: string; artistName: string; sellerName?: string; primaryGenreName: string; artworkUrl100: string; trackViewUrl: string; userRatingCount?: number; releaseDate?: string };
let lastItunes = 0;

async function appStoreGames(c: CompanyEntry, en?: string): Promise<GameItem[]> {
  // 英語名があれば英語名で探す（App Store の開発元はたいてい英語表記。検索の回数も減らせる）
  const jaName = c.name.replace(/（.*?）|\(.*?\)/g, "").trim();
  const terms = [en ?? jaName];
  const keys = [en, jaName].filter((x): x is string => Boolean(x)).map(norm).filter((k) => k.length >= 2);
  const out = new Map<string, GameItem>();
  for (const term of terms) {
    // App Store の検索は 1 分に 20 回ほどまで
    const wait = lastItunes + 3200 - Date.now();
    if (wait > 0) await sleep(wait);
    lastItunes = Date.now();
    const r = await getJson<{ results: ItunesApp[] }>(
      `https://itunes.apple.com/search?country=jp&entity=software&attribute=softwareDeveloper&limit=50&term=${encodeURIComponent(term)}`,
    ).catch(() => ({ results: [] as ItunesApp[] }));
    for (const a of r.results) {
      if (a.primaryGenreName !== "Games") continue;
      const who = norm(a.artistName) + " " + norm(a.sellerName ?? "");
      if (!keys.some((k) => norm(a.artistName) === k || who.startsWith(k))) continue;
      out.set(a.trackName, {
        title: a.trackName,
        year: a.releaseDate ? Number(a.releaseDate.slice(0, 4)) : undefined,
        role: "pub",
        url: a.trackViewUrl.split("?")[0],
        icon: a.artworkUrl100.replace("100x100bb", "128x128bb"),
        iconShape: "square",
        score: Math.round(Math.log10((a.userRatingCount ?? 0) + 1) * 10),
      });
    }
  }
  return [...out.values()];
}

// ---------- まとめる ----------
function merge(wd: GameItem[], apps: GameItem[]): GameItem[] {
  const byKey = new Map<string, GameItem>();
  for (const g of [...apps, ...wd]) {
    const k = norm(g.title).slice(0, 12);
    const old = byKey.get(k);
    if (!old) byKey.set(k, g);
    else byKey.set(k, { ...g, ...old, icon: old.iconShape === "square" ? old.icon : g.icon ?? old.icon, iconShape: old.iconShape === "square" ? "square" : g.iconShape ?? old.iconShape, url: g.url && /wikipedia/.test(g.url) ? g.url : old.url, score: Math.max(old.score ?? 0, g.score ?? 0) });
  }
  // よく知られている順（Wikipedia の言語数・App Store の評価数）
  return [...byKey.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.year ?? 0) - (a.year ?? 0)).slice(0, MAX_GAMES);
}

const prev = await readJson<GamesData>(OUT, { updatedAt: null, companies: {} });
const { companies } = await loadCompanyList();
const queue = companies.filter((c) => (!only || only.includes(c.id)) && (force || only || !prev.companies[c.id]));
console.log(`${queue.length} 社を調べる`);

let done = 0;
let saving = Promise.resolve();
const save = () => (saving = saving.then(() => writeJson(OUT, { ...prev, updatedAt: new Date().toISOString() })));

await Promise.all(
  Array.from({ length: 3 }, async () => {
    for (let c = queue.shift(); c; c = queue.shift()) {
      try {
        const found = await findCompanyQid(c);
        const wd = found ? await wikidataGames(found.qid) : [];
        const apps = await appStoreGames(c, found?.en);
        const games = merge(wd, apps);
        const entry: CompanyGames = { wikidata: found?.qid, games, checked: new Date().toISOString().slice(0, 10) };
        prev.companies[c.id] = entry;
        console.log(`- ${c.name}: ${found?.qid ?? "Wikidata なし"} / ${games.length} 本（アイコン ${games.filter((g) => g.icon).length}）`);
      } catch (e) {
        console.warn(`- ${c.name}: 失敗 ${(e as Error).message}`);
      }
      if (++done % 20 === 0) {
        console.log(`== ${done} 社 ==`);
        await save();
      }
      await sleep(800);
    }
  }),
);
await save();
await saving;
console.log("完了: public/data/games.json");
