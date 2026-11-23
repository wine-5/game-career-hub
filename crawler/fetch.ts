// ページの取得・robots.txt の確認・本文の取り出し
import * as cheerio from "cheerio";
import robotsParser from "robots-parser";

export const USER_AGENT =
  "GameCareerHubBot/0.1 (+https://github.com/wine-5/game-career-hub)";

const robotsCache = new Map<string, ReturnType<typeof robotsParser> | null>();

async function getRobots(url: URL) {
  const key = url.origin;
  if (robotsCache.has(key)) return robotsCache.get(key)!;
  const robotsUrl = `${url.origin}/robots.txt`;
  try {
    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    });
    const robots = res.ok ? robotsParser(robotsUrl, await res.text()) : null;
    robotsCache.set(key, robots);
    return robots;
  } catch {
    robotsCache.set(key, null);
    return null;
  }
}

export async function isAllowed(rawUrl: string): Promise<boolean> {
  const url = new URL(rawUrl);
  const robots = await getRobots(url);
  // robots.txt が無い・読めないときは許可とみなす（一般的な解釈）
  return robots ? robots.isAllowed(rawUrl, USER_AGENT) !== false : true;
}

export interface FetchedPage {
  url: string;
  title: string;
  text: string;
  links: { href: string; text: string }[];
}

export async function fetchPage(rawUrl: string): Promise<FetchedPage> {
  const res = await fetch(rawUrl, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "ja,en;q=0.5" },
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("html")) throw new Error(`HTML ではない (${type})`);
  const html = await res.text();
  const finalUrl = res.url || rawUrl;
  const $ = cheerio.load(html);

  const links: FetchedPage["links"] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    try {
      const abs = new URL(href, finalUrl);
      abs.hash = "";
      links.push({ href: abs.toString(), text: $(el).text().replace(/\s+/g, " ").trim() });
    } catch {
      /* 壊れた URL は無視 */
    }
  });

  $("script, style, noscript, svg, iframe, header nav, footer").remove();
  const title = $("title").first().text().trim();
  // ブロック要素の境目で改行を入れてから空白を詰める
  $("br, p, div, li, h1, h2, h3, h4, h5, h6, tr, dt, dd, section, article").each((_, el) => {
    $(el).append("\n");
  });
  const text = $("body")
    .text()
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  return { url: finalUrl, title, text, links };
}

const KEYWORDS =
  /新卒|新卒採用|インターン|intern|graduate|fresh|newgrad|new-grad|entry|エントリー|募集要項|職種|選考|説明会|学生|キャリア採用以外/i;
const SKIP = /\.(pdf|jpg|jpeg|png|gif|zip|mp4)$|mailto:|tel:|twitter\.com|x\.com|facebook\.com|youtube\.com|instagram\.com|linkedin\.com/i;

/**
 * 入口ページから、新卒・インターンに関係しそうな下のページを選ぶ。
 * 同じホストの物だけ。言葉が多く当たる物から順に max 件。
 */
export function pickSubpages(page: FetchedPage, max: number): string[] {
  const base = new URL(page.url);
  const scored = new Map<string, number>();
  for (const l of page.links) {
    if (SKIP.test(l.href)) continue;
    let u: URL;
    try {
      u = new URL(l.href);
    } catch {
      continue;
    }
    if (u.host !== base.host || u.toString() === page.url) continue;
    let score = 0;
    if (KEYWORDS.test(l.text)) score += 2;
    if (KEYWORDS.test(u.pathname)) score += 1;
    if (/中途|career(?!.*fresh)/i.test(l.text)) score -= 2;
    if (score <= 0) continue;
    scored.set(u.toString(), Math.max(score, scored.get(u.toString()) ?? 0));
  }
  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([u]) => u);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
