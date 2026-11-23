// data/companies.json の会社の情報（名前・タグ・飛び先・ロゴ）を、取得せずに jobs.json へ写す。
// 会社の一覧を手で直したあとに使う。
//
//   npm run sync
import type { JobsData } from "../src/types.ts";
import { baseResult, loadAll, writeJson, OUT_FILE } from "./shared.ts";

const { companies, prev, targetGraduationYear } = await loadAll();
const prevById = new Map(prev.companies.map((c) => [c.id, c]));
const out: JobsData = {
  ...prev,
  targetGraduationYear,
  companies: companies.map((c) => baseResult(c, prevById.get(c.id))),
};
await writeJson(OUT_FILE, out);
console.log(`${out.companies.length} 社の情報を jobs.json に写した`);
