// 【Claude Code で更新する時の 3 段目】
// Claude Code が書いた .work/extracted/<id>.json を確かめて public/data/jobs.json に取り込む。
// 形のおかしい物は取り込まずに理由を出す（直して再実行すればよい）。
//
//   npm run apply
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { JobsData } from "../src/types.ts";
import {
  loadSettings, mergeExtracted, readJson, todayJst, validateExtracted, writeJson,
  OUT_FILE, ROOT, STATE_FILE, WORK_DIR, type Extracted, type State,
} from "./shared.ts";
import type { TodoItem } from "./collect.ts";

const work = await readJson<{ today: string; todo: TodoItem[]; failed: unknown[] } | null>(
  path.join(WORK_DIR, "todo.json"),
  null,
);
if (!work) {
  console.error(".work/todo.json が無い。先に npm run collect を実行する");
  process.exit(1);
}

const data = await readJson<JobsData>(OUT_FILE, { updatedAt: null, model: null, companies: [] });
const state = await readJson<State>(STATE_FILE, {});
const byId = new Map(data.companies.map((c) => [c.id, c]));
const { targetGraduationYear } = await loadSettings();
const today = todayJst();
const now = new Date().toISOString();

let applied = 0;
const problems: string[] = [];
const missing: string[] = [];
const report: string[] = [];

for (const t of work.todo) {
  let raw: string;
  try {
    raw = await readFile(path.join(ROOT, t.extractedFile), "utf8");
  } catch {
    missing.push(`${t.name}（${t.extractedFile}）`);
    continue;
  }
  let ex: Extracted;
  try {
    ex = JSON.parse(raw) as Extracted;
  } catch (e) {
    problems.push(`${t.name}: JSON として読めない (${(e as Error).message})`);
    continue;
  }
  const errs = validateExtracted(ex);
  if (errs.length) {
    problems.push(`${t.name}:\n    ${errs.join("\n    ")}`);
    continue;
  }
  const result = byId.get(t.id);
  if (!result) {
    problems.push(`${t.name}: jobs.json に会社が無い（collect をやり直す）`);
    continue;
  }
  const { added, removed, skipped } = mergeExtracted(result, ex, new Set(t.pageUrls), today, now, targetGraduationYear);
  state[t.id] = { hash: t.hash };
  applied++;
  report.push(
    `${t.name}: 募集 ${result.openings.length} 件` +
      (added.length ? ` / 新しく ${added.length} 件（${added.map((o) => o.title).join("、")}）` : "") +
      (removed.length ? ` / 消えた ${removed.length} 件` : "") +
      (skipped ? ` / ${targetGraduationYear}年卒向けでないので外した ${skipped} 件` : ""),
  );
}

if (applied > 0) {
  data.updatedAt = now;
  data.model = "claude-code";
}
data.targetGraduationYear = targetGraduationYear;
await writeJson(OUT_FILE, data);
await writeJson(STATE_FILE, state);

console.log(`取り込んだ: ${applied} / ${work.todo.length} 社`);
for (const r of report) console.log("  " + r);
if (missing.length) console.log(`\nまだ整理していない会社:\n  ${missing.join("\n  ")}`);
if (problems.length) {
  console.log(`\n形がおかしくて取り込まなかった会社（直して npm run apply をもう一度）:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
