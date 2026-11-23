// 【Claude Code で更新する時の 1 段目】
// 採用ページを取りに行き、前回の整理から中身が変わった会社だけ .work/pages/<id>.md に書き出す。
// AI は呼ばない。書き出した物を Claude Code が読んで .work/extracted/<id>.json を作り、
// `npm run apply` で取り込む（手順は CLAUDE.md）。
//
//   npm run collect                       全社
//   npm run collect -- --only=sega,capcom 指定した会社だけ
//   npm run collect -- --force            変化が無くても書き出す（整理し直したいとき）
import { rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  baseResult, collectPages, hashPages, loadAll, parseArgs, sleep, toPromptPages, todayJst,
  writeJson, OUT_FILE, WAIT_MS, WORK_DIR,
} from "./shared.ts";
import type { JobsData } from "../src/types.ts";

export interface TodoItem {
  id: string;
  name: string;
  pagesFile: string;
  extractedFile: string;
  hash: string;
  pageUrls: string[];
}

const { force, only } = parseArgs(process.argv.slice(2));
const { companies, state, prev, targetGraduationYear } = await loadAll();
const prevById = new Map(prev.companies.map((c) => [c.id, c]));
const today = todayJst();

await rm(WORK_DIR, { recursive: true, force: true });
await mkdir(path.join(WORK_DIR, "pages"), { recursive: true });
await mkdir(path.join(WORK_DIR, "extracted"), { recursive: true });

const results = [];
const todo: TodoItem[] = [];
const failed: { id: string; name: string; error: string }[] = [];
let unchanged = 0;

for (const c of companies) {
  const result = baseResult(c, prevById.get(c.id));
  results.push(result);
  if (!c.enabled || (only && !only.includes(c.id))) continue;

  console.log(`- ${c.name}`);
  result.lastChecked = new Date().toISOString();
  try {
    const pages = toPromptPages(await collectPages(c.url));
    const hash = hashPages(pages);
    const changed = state[c.id]?.hash !== hash;
    console.log(`    ${pages.length} ページ / ${changed ? "変化あり" : "変化なし"}`);
    result.error = null;
    if (!changed && !force) {
      unchanged++;
    } else {
      const pagesFile = path.join(WORK_DIR, "pages", `${c.id}.md`);
      const body = pages.map((p) => `## ページ: ${p.url}\n題名: ${p.title}\n\n${p.text}`).join("\n\n---\n\n");
      await writeFile(pagesFile, `# ${c.name}（${c.id}）\n今日の日付: ${today}\n対象の卒業年: ${targetGraduationYear}\n\n${body}\n`, "utf8");
      todo.push({
        id: c.id,
        name: c.name,
        pagesFile: path.relative(process.cwd(), pagesFile).replaceAll("\\", "/"),
        extractedFile: `.work/extracted/${c.id}.json`,
        hash,
        pageUrls: pages.map((p) => p.url),
      });
    }
  } catch (e) {
    result.error = (e as Error).message;
    failed.push({ id: c.id, name: c.name, error: result.error });
    console.warn(`    失敗: ${result.error}`);
  }
  await sleep(WAIT_MS);
}

await writeJson(path.join(WORK_DIR, "todo.json"), { today, todo, failed });
// 確認した日時と失敗だけを先に反映しておく（募集の中身は apply で変わる）
const out: JobsData = { ...prev, targetGraduationYear, companies: results };
await writeJson(OUT_FILE, out);

console.log("");
console.log(`変化あり: ${todo.length} 社 / 変化なし: ${unchanged} 社 / 失敗: ${failed.length} 社`);
if (todo.length) {
  console.log("次: .work/todo.json の会社ごとに pagesFile を読み、crawler/EXTRACTION_RULES.md に従って extractedFile を書く → npm run apply");
}
