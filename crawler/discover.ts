// 会社ごとの「新卒採用」「インターン」「企業理念」のページと、ロゴ（サイトのアイコン）を探して
// data/companies.json に書き込む。会社を足したときに 1 回動かせばよい。
//
//   npm run discover                       まだ埋まっていない所だけ探す
//   npm run discover -- --only=sega        指定した会社だけ
//   npm run discover -- --overwrite        埋まっている所も探し直す
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import type { CompanyEntry, CompanyLinks } from "../src/types.ts";
import { fetchPage, isAllowed, USER_AGENT, type FetchedPage } from "./fetch.ts";
import { COMPANIES_FILE, ROOT, readJson, sleep, WAIT_MS } from "./shared.ts";

const LOGO_DIR = path.join(ROOT, "public/assets/logos");
const argv = process.argv.slice(2);
const OVERWRITE = argv.includes("--overwrite");
const ONLY = argv.find((a) => a.startsWith("--only="))?.slice(7).split(",").filter(Boolean);

const RULES = {
  newgrad: { text: /新卒/, url: /new-?grad|graduate|fresh|shinsotsu|newgrad|new_graduates/i },
  internship: { text: /インターン/i, url: /intern/i },
  philosophy: {
    text: /企業理念|経営理念|理念|フィロソフィ|ミッション|ビジョン|Mission|Philosophy|Vision|Purpose|パーパス/i,
    url: /philosophy|mission|vision|rinen|purpose|policy|values/i,
  },
  company: { text: /企業情報|会社情報|会社概要|企業概要|コーポレート|Corporate|Company|About/i, url: /corporate|company|about|info/i },
};
const NEGATIVE = /中途|キャリア採用|経験者|アルバイト|障がい|career(?!.*fresh)/i;

async function tryFetch(url: string): Promise<FetchedPage | null> {
  try {
    if (!(await isAllowed(url))) return null;
    const p = await fetchPage(url);
    await sleep(WAIT_MS);
    return p;
  } catch {
    return null;
  }
}

function best(pages: FetchedPage[], rule: { text: RegExp; url: RegExp }, avoid?: string): string | undefined {
  const score = new Map<string, number>();
  for (const p of pages) {
    for (const l of p.links) {
      if (!/^https?:/.test(l.href) || l.href === avoid) continue;
      let s = 0;
      if (rule.text.test(l.text)) s += 3;
      if (rule.url.test(new URL(l.href).pathname)) s += 2;
      if (NEGATIVE.test(l.text) || NEGATIVE.test(l.href)) s -= 5;
      if (l.text.length > 40) s -= 1; // 長い文はニュース記事のことが多い
      if (s > 0) score.set(l.href, Math.max(s, score.get(l.href) ?? 0));
    }
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/** ページの中から理念の見出しを探し、そこへ飛ぶ URL（#id か #:~:text=）を作る */
function jumpTo(page: FetchedPage): string | null {
  const $ = cheerio.load(page.html);
  let found: string | null = null;
  $("h1, h2, h3, h4, dt, th, p strong, span, div").each((_, el) => {
    if (found) return;
    const own = $(el).clone().children().remove().end().text().replace(/\s+/g, " ").trim();
    if (!own || own.length > 30 || !RULES.philosophy.text.test(own)) return;
    const id = $(el).attr("id") ?? $(el).parent().attr("id");
    found = id ? `#${id}` : `#:~:text=${encodeURIComponent(own)}`;
  });
  if (!found) return null;
  const u = new URL(page.url);
  u.hash = "";
  return u.toString() + found;
}

async function findPhilosophy(pages: FetchedPage[]): Promise<string | undefined> {
  const direct = best(pages, RULES.philosophy);
  const candidates = [direct, best(pages, RULES.company)].filter((u): u is string => Boolean(u));
  for (const url of candidates) {
    const page = await tryFetch(url);
    if (!page) continue;
    const jump = jumpTo(page);
    if (jump) return jump;
    // 企業情報のページから、さらに理念のページを 1 段だけ辿る
    const deeper = best([page], RULES.philosophy);
    if (deeper) {
      const p2 = await tryFetch(deeper);
      if (p2) return jumpTo(p2) ?? deeper;
    }
    if (url === direct) return direct;
  }
  return undefined;
}

const EXT: Record<string, string> = {
  "image/png": "png", "image/svg+xml": "svg", "image/x-icon": "ico", "image/vnd.microsoft.icon": "ico",
  "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif",
};

async function findLogo(c: CompanyEntry, pages: FetchedPage[]): Promise<string | undefined> {
  const urls: { href: string; score: number }[] = [];
  for (const p of pages) {
    const $ = cheerio.load(p.html);
    $("link[rel][href]").each((_, el) => {
      const rel = ($(el).attr("rel") ?? "").toLowerCase();
      if (!rel.includes("icon")) return;
      const size = Number(($(el).attr("sizes") ?? "").split("x")[0]) || 0;
      const href = new URL($(el).attr("href")!, p.url).toString();
      const score = (rel.includes("apple-touch") ? 1000 : 0) + size + (href.endsWith(".svg") ? 500 : 0);
      urls.push({ href, score });
    });
    const origin = new URL(p.url).origin;
    urls.push({ href: `${origin}/apple-touch-icon.png`, score: 1 }, { href: `${origin}/favicon.ico`, score: 0 });
  }
  urls.sort((a, b) => b.score - a.score);
  for (const { href } of urls) {
    try {
      if (!(await isAllowed(href))) continue;
      const res = await fetch(href, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(20_000) });
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
      const ext = EXT[type];
      if (!res.ok || !ext) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100) continue;
      await mkdir(LOGO_DIR, { recursive: true });
      await writeFile(path.join(LOGO_DIR, `${c.id}.${ext}`), buf);
      return `logos/${c.id}.${ext}`;
    } catch {
      /* 次の候補へ */
    }
  }
  return undefined;
}

/** companies.json を、1 社 1 行の読みやすい形で書き戻す */
async function save(data: { $comment?: string; companies: CompanyEntry[] }) {
  const lines = data.companies.map((c) => "    " + JSON.stringify(c));
  const body = `{\n  "$comment": ${JSON.stringify(data.$comment ?? "")},\n  "companies": [\n${lines.join(",\n")}\n  ]\n}\n`;
  await writeFile(COMPANIES_FILE, body, "utf8");
}

const data = await readJson<{ $comment?: string; companies: CompanyEntry[] }>(COMPANIES_FILE, { companies: [] });

for (const c of data.companies) {
  if (!c.enabled || (ONLY && !ONLY.includes(c.id))) continue;
  const links: CompanyLinks = { ...c.links };
  const need = (k: keyof CompanyLinks) => OVERWRITE || !links[k];
  if (!need("newgrad") && !need("internship") && !need("philosophy") && c.logo && !OVERWRITE) continue;

  console.log(`- ${c.name}`);
  const recruit = await tryFetch(c.url);
  if (!recruit) {
    console.warn("    採用ページを取れなかった");
    continue;
  }
  const topUrl = new URL(c.url).origin + "/";
  const top = topUrl === recruit.url ? recruit : await tryFetch(topUrl);
  const pages = [recruit, ...(top ? [top] : [])];

  if (need("newgrad")) {
    links.newgrad = /新卒/.test(recruit.title) ? recruit.url : best(pages, RULES.newgrad) ?? recruit.url;
  }
  if (need("internship")) {
    links.internship = best(pages, RULES.internship, links.newgrad);
  }
  if (need("philosophy")) {
    links.philosophy = await findPhilosophy(pages);
  }
  if (OVERWRITE || !c.logo) {
    c.logo = (await findLogo(c, top ? [top, recruit] : [recruit])) ?? c.logo;
  }
  c.links = Object.fromEntries(Object.entries(links).filter(([, v]) => v)) as CompanyLinks;
  console.log(`    新卒: ${links.newgrad ?? "—"}`);
  console.log(`    インターン: ${links.internship ?? "—"}`);
  console.log(`    企業理念: ${links.philosophy ? decodeURIComponent(links.philosophy) : "—"}`);
  console.log(`    ロゴ: ${c.logo ?? "—"}`);
  await save(data);
}
console.log("完了。結果は data/companies.json。おかしな飛び先は手で直す（直した所は次から上書きされない）");
