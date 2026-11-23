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
import { loadCompanyList, ROOT, saveCompanyList, sleep, WAIT_MS } from "./shared.ts";
import { extractPrefectures } from "./location.ts";

const LOGO_DIR = path.join(ROOT, "public/assets/logos");
const argv = process.argv.slice(2);
const OVERWRITE = argv.includes("--overwrite");
const ONLY = argv.find((a) => a.startsWith("--only="))?.slice(7).split(",").filter(Boolean);

const RULES = {
  newgrad: { text: /新卒/, url: /new-?grad|graduate|fresh|shinsotsu|newgrad|new_graduates/i },
  internship: { text: /インターン/i, url: /intern/i },
  philosophy: {
    text: /企業理念|経営理念|理念|フィロソフィ|ミッション|ビジョン|Mission|Philosophy|Vision|Purpose|パーパス/i,
    url: /philosophy|mission|vision|rinen|purpose|values/i,
  },
  company: { text: /企業情報|会社情報|会社概要|企業概要|コーポレート|Corporate|Company|About/i, url: /corporate|company|about|info/i },
  salary: { text: /初任給|給与|報酬|待遇|処遇|募集要項|Salary|Compensation/i, url: /salary|requirement|youkou|guideline|outline|detail|benefit|welfare/i },
};
// 給与の見出し（ページの中で飛ぶ先）
const SALARY_HEADING = /初任給|給与|報酬|月給|年俸/;
// 採用・理念と関係の無いページ（規約・統制・社員インタビューなど）
const NEGATIVE =
  /中途|キャリア採用|経験者|アルバイト|障がい|career(?!.*fresh)|privacy|プライバシー|個人情報|ハラスメント|harassment|governance|ガバナンス|内部統制|internal|cookie|interview|インタビュー|crosstalk|対談|社員紹介/i;

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
function jumpTo(page: FetchedPage, heading: RegExp = RULES.philosophy.text): string | null {
  const $ = cheerio.load(page.html);
  let found: string | null = null;
  $("h1, h2, h3, h4, dt, th, p strong, span, div").each((_, el) => {
    if (found) return;
    const own = $(el).clone().children().remove().end().text().replace(/\s+/g, " ").trim();
    if (!own || own.length > 30 || !heading.test(own)) return;
    // パンくずや見出し部の id は理念の所ではないので使わない
    const rawId = $(el).attr("id");
    const id = rawId && !/breadcrumb|nav|header|menu|top/i.test(rawId) ? rawId : undefined;
    found = id ? `#${id}` : `#:~:text=${encodeURIComponent(own)}`;
  });
  if (!found) return null;
  const u = new URL(page.url);
  u.hash = "";
  return u.toString() + found;
}

/** 新卒の給与（初任給・待遇）が書かれている所を探す。採用ページの中か、募集要項のページ */
async function findSalary(pages: FetchedPage[]): Promise<string | undefined> {
  for (const p of pages) {
    const here = jumpTo(p, SALARY_HEADING);
    if (here) return here;
  }
  const link = best(pages, RULES.salary);
  if (!link) return undefined;
  const page = await tryFetch(link);
  return page ? jumpTo(page, SALARY_HEADING) ?? undefined : undefined;
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

const data = await loadCompanyList();

// 会社ごとに別のサイトなので、何社かを同時に進める（同じサイトへの間隔は tryFetch の待ちで守る）
const JOBS = Number(argv.find((a) => a.startsWith("--jobs="))?.slice(7) ?? 6);
let saving = Promise.resolve();
const save = () => (saving = saving.then(() => saveCompanyList(data)));

async function processCompany(c: CompanyEntry) {
  const log: string[] = [];
  const out = () => console.log(log.join(String.fromCharCode(10)));
  const links: CompanyLinks = { ...c.links };
  const need = (k: keyof CompanyLinks) => OVERWRITE || (!links[k] && (c.enabled || k === "philosophy"));
  const needPlace = OVERWRITE || !c.locations?.length;
  if (!need("newgrad") && !need("internship") && !need("philosophy") && !need("salary") && c.logo && !needPlace) return;

  log.push(`- ${c.name}`);
  const recruit = await tryFetch(c.url);
  if (!recruit) {
    log.push("    採用ページを取れなかった");
    out();
    return;
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
  if (need("salary")) {
    // 新卒の採用ページを先に見る（給与は新卒の募集要項に書かれていることが多い）
    const ng = links.newgrad && links.newgrad !== recruit.url ? await tryFetch(links.newgrad) : null;
    links.salary = await findSalary([...(ng ? [ng] : []), recruit]);
  }
  if (need("philosophy")) {
    links.philosophy = await findPhilosophy(pages);
  }
  if (needPlace) {
    // 会社概要・アクセスのページと、採用ページ（勤務地）から都道府県を読む
    const about = best(pages, RULES.company);
    const aboutPage = about ? await tryFetch(about) : null;
    const texts = [...pages, ...(aboutPage ? [aboutPage] : [])].map((p) => p.text).join(String.fromCharCode(10));
    const prefs = extractPrefectures(texts);
    if (prefs.length) c.locations = prefs;
  }
  if (OVERWRITE || !c.logo) {
    c.logo = (await findLogo(c, top ? [top, recruit] : [recruit])) ?? c.logo;
  }
  c.links = Object.fromEntries(Object.entries(links).filter(([, v]) => v)) as CompanyLinks;
  log.push(`    新卒: ${links.newgrad ?? "—"}`);
  log.push(`    インターン: ${links.internship ?? "—"}`);
  log.push(`    給与: ${links.salary ? decodeURIComponent(links.salary) : "—"}`);
  log.push(`    企業理念: ${links.philosophy ? decodeURIComponent(links.philosophy) : "—"}`);
  log.push(`    ロゴ: ${c.logo ?? "—"}`);
  log.push(`    所在地: ${c.locations?.join("・") ?? "—"}`);
  out();
  await save();
}

// 収集の対象外（enabled: false）の会社も、ロゴ・所在地・理念は探す（会社の一覧に出すため）
const queue = data.companies.filter((c) => !ONLY || ONLY.includes(c.id));
let done = 0;
await Promise.all(
  Array.from({ length: JOBS }, async () => {
    for (let c = queue.shift(); c; c = queue.shift()) {
      try {
        await processCompany(c);
      } catch (e) {
        console.warn(`- ${c.name}: 失敗 ${(e as Error).message}`);
      }
      if (++done % 25 === 0) console.log(`== ${done} 社まで終わった ==`);
    }
  }),
);
await save();

console.log("完了。結果は data/companies.json。おかしな飛び先は手で直す（直した所は次から上書きされない）");
