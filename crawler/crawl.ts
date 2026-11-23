// 会社の採用ページを巡回し、変わった会社だけ AI で整理して public/data/jobs.json に書く
//
//   npm run crawl                 全社
//   npm run crawl -- --only=capcom,sega   指定した会社だけ
//   npm run crawl:dry             取得だけして AI を呼ばない（ページの変化の確認用）
//   npm run crawl -- --force      変化が無くても AI で整理し直す
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CompanyEntry, CompanyResult, JobsData, Opening } from "../src/types.ts";
import { fetchPage, isAllowed, pickSubpages, sleep, type FetchedPage } from "./fetch.ts";
import { extract, hasApiKey, MODEL } from "./extract.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMPANIES_FILE = path.join(ROOT, "data/companies.json");
const STATE_FILE = path.join(ROOT, "data/state.json");
const OUT_FILE = path.join(ROOT, "public/data/jobs.json");

const MAX_SUBPAGES = 4; // 入口ページから辿る下のページの数
const MAX_CHARS_PER_PAGE = 20_000; // 1 ページから AI に渡す文字数の上限
const WAIT_MS = 1_500; // 同じサイトへの連続アクセスの間隔

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const FORCE = args.includes("--force");
const ONLY = args.find((a) => a.startsWith("--only="))?.slice(7).split(",").filter(Boolean);

type State = Record<string, { hash: string }>;

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

const sha1 = (s: string) => createHash("sha1").update(s).digest("hex");
const todayJst = () =>
  new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

function emptyResult(c: CompanyEntry): CompanyResult {
  return {
    id: c.id, name: c.name, tags: c.tags, url: c.url, enabled: c.enabled, note: c.note,
    lastChecked: null, lastChanged: null, error: null, digest: "", openings: [],
  };
}

async function collectPages(startUrl: string): Promise<FetchedPage[]> {
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

async function main() {
  const { companies } = await readJson<{ companies: CompanyEntry[] }>(COMPANIES_FILE, { companies: [] });
  const state = await readJson<State>(STATE_FILE, {});
  const prev = await readJson<JobsData>(OUT_FILE, { updatedAt: null, model: null, companies: [] });
  const prevById = new Map(prev.companies.map((c) => [c.id, c]));
  const today = todayJst();
  const useAi = !DRY && hasApiKey();

  if (!DRY && !hasApiKey()) {
    console.warn("ANTHROPIC_API_KEY が無いので、ページの取得だけ行い AI での整理は飛ばします。");
  }
  console.log(`モデル: ${useAi ? MODEL : "（使わない）"} / 会社: ${companies.length} 社`);

  const results: CompanyResult[] = [];
  let aiCalls = 0;

  for (const c of companies) {
    const old = prevById.get(c.id);
    // 会社の一覧の側で変えた名前やタグを反映する
    const result: CompanyResult = { ...(old ?? emptyResult(c)), name: c.name, tags: c.tags, url: c.url, enabled: c.enabled, note: c.note };
    results.push(result);

    if (!c.enabled || (ONLY && !ONLY.includes(c.id))) continue;

    console.log(`- ${c.name} (${c.url})`);
    const now = new Date().toISOString();
    try {
      const pages = await collectPages(c.url);
      const trimmed = pages.map((p) => ({
        url: p.url,
        title: p.title,
        text: p.text.length > MAX_CHARS_PER_PAGE ? p.text.slice(0, MAX_CHARS_PER_PAGE) : p.text,
      }));
      const hash = sha1(trimmed.map((p) => p.url + "\n" + p.text).join("\n---\n"));
      const changed = state[c.id]?.hash !== hash;
      console.log(`    ${pages.length} ページ / ${changed ? "変化あり" : "変化なし"}`);

      result.lastChecked = now;
      if (!changed && !FORCE && old?.lastChanged) {
        result.error = null;
        continue;
      }
      if (!useAi) {
        if (!DRY) result.error = "AI が未設定のため、内容を整理できていない";
        continue;
      }

      const ex = await extract(c.name, trimmed, today);
      aiCalls++;
      const pageUrls = new Set(trimmed.map((p) => p.url));
      const oldOpenings = new Map((old?.openings ?? []).map((o) => [o.id, o]));
      const seen = new Set<string>();
      const openings: Opening[] = [];
      for (const o of ex.openings) {
        const id = sha1(`${c.id}|${o.type}|${o.title.trim()}`).slice(0, 12);
        if (seen.has(id)) continue;
        seen.add(id);
        openings.push({
          ...o,
          id,
          companyId: c.id,
          roles: o.roles.length ? [...new Set(o.roles)] : ["other"],
          sourceUrl: pageUrls.has(o.sourceUrl) ? o.sourceUrl : c.url,
          firstSeen: oldOpenings.get(id)?.firstSeen ?? today,
        });
      }
      result.openings = openings;
      result.digest = ex.digest;
      result.lastChanged = now;
      result.error = null;
      state[c.id] = { hash };
      await writeJson(STATE_FILE, state);
      console.log(`    募集 ${openings.length} 件`);
    } catch (e) {
      result.lastChecked = now;
      result.error = (e as Error).message;
      console.warn(`    失敗: ${result.error}`);
    }
    await sleep(WAIT_MS);
  }

  const out: JobsData = {
    updatedAt: useAi && aiCalls > 0 ? new Date().toISOString() : prev.updatedAt ?? new Date().toISOString(),
    model: aiCalls > 0 ? MODEL : prev.model,
    companies: results,
  };
  if (!DRY) await writeJson(OUT_FILE, out);
  console.log(`完了: AI の呼び出し ${aiCalls} 回`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
