// 収集の各スクリプトで共有する物（置き場・取得・結果の取り込み）
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CompanyEntry, CompanyResult, JobsData, Opening } from "../src/types.ts";
import { ROLES } from "../src/types.ts";
import { fetchPage, isAllowed, pickSubpages, sleep, type FetchedPage } from "./fetch.ts";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const COMPANIES_FILE = path.join(ROOT, "data/companies.json");
export const STATE_FILE = path.join(ROOT, "data/state.json");
export const OUT_FILE = path.join(ROOT, "public/data/jobs.json");
export const RULES_FILE = path.join(ROOT, "crawler/EXTRACTION_RULES.md");
export const SETTINGS_FILE = path.join(ROOT, "data/settings.json");
/** 収集の途中の物（git には入れない） */
export const WORK_DIR = path.join(ROOT, ".work");

export const MAX_SUBPAGES = 4; // 入口ページから辿る下のページの数
export const MAX_CHARS_PER_PAGE = 20_000; // 1 ページから整理に回す文字数の上限
export const WAIT_MS = 1_500; // 同じサイトへの連続アクセスの間隔

/** 会社ごとの「最後に整理した時のページの中身」の hash */
export type State = Record<string, { hash: string }>;

export interface PromptPage {
  url: string;
  title: string;
  text: string;
}

export interface ExtractedOpening {
  title: string;
  type: Opening["type"];
  roles: Opening["roles"];
  graduationYears: number[];
  applyStart: string;
  deadline: string;
  period: string;
  format: Opening["format"];
  location: string;
  summary: string;
  sourceUrl: string;
}

export interface Extracted {
  digest: string;
  openings: ExtractedOpening[];
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(file: string, data: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export const sha1 = (s: string) => createHash("sha1").update(s).digest("hex");
export const todayJst = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

export function parseArgs(argv: string[]) {
  return {
    force: argv.includes("--force"),
    only: argv.find((a) => a.startsWith("--only="))?.slice(7).split(",").filter(Boolean),
  };
}

export async function loadAll() {
  const { companies } = await readJson<{ companies: CompanyEntry[] }>(COMPANIES_FILE, { companies: [] });
  const state = await readJson<State>(STATE_FILE, {});
  const prev = await readJson<JobsData>(OUT_FILE, { updatedAt: null, model: null, companies: [] });
  const { targetGraduationYear } = await loadSettings();
  return { companies, state, prev, targetGraduationYear };
}

export async function loadSettings() {
  return readJson<{ targetGraduationYear: number }>(SETTINGS_FILE, { targetGraduationYear: 2028 });
}

/** 会社の一覧の側（名前・タグ・URL・有効か）を、前回の結果に重ねる */
export function baseResult(c: CompanyEntry, old: CompanyResult | undefined): CompanyResult {
  return {
    lastChecked: null, lastChanged: null, error: null, digest: "", openings: [],
    ...old,
    id: c.id, name: c.name, tags: c.tags, url: c.url, enabled: c.enabled, note: c.note,
  };
}

/** 入口ページと、新卒・インターンらしい下のページを取ってくる */
export async function collectPages(startUrl: string): Promise<FetchedPage[]> {
  if (!(await isAllowed(startUrl))) throw new Error("robots.txt で自動アクセスが禁止されている");
  const start = await fetchPage(startUrl);
  const pages = [start];
  for (const sub of pickSubpages(start, MAX_SUBPAGES)) {
    await sleep(WAIT_MS);
    try {
      if (!(await isAllowed(sub))) continue;
      pages.push(await fetchPage(sub));
    } catch (e) {
      console.warn(`    下のページを取れなかった ${sub}: ${(e as Error).message}`);
    }
  }
  return pages;
}

export function toPromptPages(pages: FetchedPage[]): PromptPage[] {
  return pages.map((p) => ({
    url: p.url,
    title: p.title,
    text: p.text.length > MAX_CHARS_PER_PAGE ? p.text.slice(0, MAX_CHARS_PER_PAGE) : p.text,
  }));
}

export function hashPages(pages: PromptPage[]): string {
  return sha1(pages.map((p) => p.url + "\n" + p.text).join("\n---\n"));
}

const DATE = /^(\d{4}-\d{2}-\d{2})?$/;
const TYPES = ["internship", "newgrad", "event", "other"];
const FORMATS = ["online", "onsite", "hybrid", "unknown"];

/** 整理した結果の形を確かめる。おかしな所を文で返す（無ければ空の配列） */
export function validateExtracted(x: unknown): string[] {
  const errs: string[] = [];
  const e = x as Extracted;
  if (!e || typeof e !== "object") return ["JSON のオブジェクトではない"];
  if (typeof e.digest !== "string") errs.push("digest が文字列ではない");
  if (!Array.isArray(e.openings)) return [...errs, "openings が配列ではない"];
  e.openings.forEach((o, i) => {
    const at = `openings[${i}]`;
    if (!o.title || typeof o.title !== "string") errs.push(`${at}.title が無い`);
    if (!TYPES.includes(o.type)) errs.push(`${at}.type が ${TYPES.join("/")} のどれでもない: ${o.type}`);
    if (!Array.isArray(o.roles) || o.roles.some((r) => !(ROLES as readonly string[]).includes(r)))
      errs.push(`${at}.roles に知らない職種がある: ${JSON.stringify(o.roles)}`);
    if (!Array.isArray(o.graduationYears) || o.graduationYears.some((y) => !Number.isInteger(y) || y < 2000 || y > 2100))
      errs.push(`${at}.graduationYears は西暦の整数の配列にする`);
    for (const k of ["applyStart", "deadline"] as const)
      if (typeof o[k] !== "string" || !DATE.test(o[k])) errs.push(`${at}.${k} は YYYY-MM-DD か空文字にする: ${o[k]}`);
    for (const k of ["period", "location", "summary", "sourceUrl"] as const)
      if (typeof o[k] !== "string") errs.push(`${at}.${k} が文字列ではない`);
    if (!FORMATS.includes(o.format)) errs.push(`${at}.format が ${FORMATS.join("/")} のどれでもない: ${o.format}`);
  });
  return errs;
}

/**
 * 整理した結果を、会社の結果に取り込む（ID を振り、初めて見た日を引き継ぐ）。
 * 対象の卒業年（targetYear）向けと分かる募集だけを残す。
 */
export function mergeExtracted(
  result: CompanyResult,
  ex: Extracted,
  pageUrls: Set<string>,
  today: string,
  now: string,
  targetYear: number,
) {
  const oldOpenings = new Map(result.openings.map((o) => [o.id, o]));
  const seen = new Set<string>();
  const openings: Opening[] = [];
  let skipped = 0;
  for (const o of ex.openings) {
    if (!o.graduationYears.includes(targetYear)) {
      skipped++;
      continue;
    }
    const id = sha1(`${result.id}|${o.type}|${o.title.trim()}`).slice(0, 12);
    if (seen.has(id)) continue;
    seen.add(id);
    openings.push({
      ...o,
      title: o.title.trim(),
      id,
      companyId: result.id,
      roles: o.roles.length ? [...new Set(o.roles)] : ["other"],
      sourceUrl: pageUrls.has(o.sourceUrl) ? o.sourceUrl : result.url,
      firstSeen: oldOpenings.get(id)?.firstSeen ?? today,
    });
  }
  const before = new Set(oldOpenings.keys());
  result.openings = openings;
  result.digest = ex.digest;
  result.lastChanged = now;
  result.error = null;
  return {
    skipped,
    added: openings.filter((o) => !before.has(o.id)),
    removed: [...before].filter((id) => !seen.has(id)).map((id) => oldOpenings.get(id)!),
  };
}

export { sleep };
