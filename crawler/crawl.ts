// 【API で自動更新する経路】（ふだんは Claude Code で更新する。CLAUDE.md を参照）
// 会社の採用ページを巡回し、変わった会社だけ Claude API で整理して public/data/jobs.json に書く。
// ANTHROPIC_API_KEY が要る。
//
//   npm run crawl:api                       全社
//   npm run crawl:api -- --only=capcom,sega 指定した会社だけ
//   npm run crawl:api -- --force            変化が無くても整理し直す
import type { CompanyResult, JobsData } from "../src/types.ts";
import {
  baseResult, collectPages, hashPages, loadAll, mergeExtracted, parseArgs, sleep, toPromptPages,
  todayJst, writeJson, OUT_FILE, STATE_FILE, WAIT_MS,
} from "./shared.ts";
import { extract, hasApiKey, MODEL } from "./extract.ts";

async function main() {
  const { force, only } = parseArgs(process.argv.slice(2));
  if (!hasApiKey()) {
    console.error("ANTHROPIC_API_KEY が無い。API を使わずに更新するときは CLAUDE.md の手順（npm run collect）を使う");
    process.exit(1);
  }
  const { companies, state, prev, targetGraduationYear } = await loadAll();
  const prevById = new Map(prev.companies.map((c) => [c.id, c]));
  const today = todayJst();
  console.log(`モデル: ${MODEL} / 会社: ${companies.length} 社`);

  const results: CompanyResult[] = [];
  let aiCalls = 0;

  for (const c of companies) {
    const result = baseResult(c, prevById.get(c.id));
    results.push(result);
    if (!c.enabled || (only && !only.includes(c.id))) continue;

    console.log(`- ${c.name} (${c.url})`);
    const now = new Date().toISOString();
    result.lastChecked = now;
    try {
      const pages = toPromptPages(await collectPages(c.url));
      const hash = hashPages(pages);
      const changed = state[c.id]?.hash !== hash;
      console.log(`    ${pages.length} ページ / ${changed ? "変化あり" : "変化なし"}`);
      result.error = null;
      if (!changed && !force) continue;

      const ex = await extract(c.name, pages, today, targetGraduationYear);
      aiCalls++;
      mergeExtracted(result, ex, new Set(pages.map((p) => p.url)), today, now, targetGraduationYear);
      state[c.id] = { hash };
      await writeJson(STATE_FILE, state);
      console.log(`    募集 ${result.openings.length} 件`);
    } catch (e) {
      result.error = (e as Error).message;
      console.warn(`    失敗: ${result.error}`);
    }
    await sleep(WAIT_MS);
  }

  const out: JobsData = {
    updatedAt: aiCalls > 0 ? new Date().toISOString() : prev.updatedAt,
    model: aiCalls > 0 ? MODEL : prev.model,
    targetGraduationYear,
    companies: results,
  };
  await writeJson(OUT_FILE, out);
  console.log(`完了: AI の呼び出し ${aiCalls} 回`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
