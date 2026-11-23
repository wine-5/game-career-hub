// data/companies.json の URL が生きているかと、robots.txt で許可されているかを一覧にする
//   npm run check-urls
import { readFile } from "node:fs/promises";
import type { CompanyEntry } from "../src/types.ts";
import { isAllowed, USER_AGENT } from "./fetch.ts";

const { companies } = JSON.parse(
  await readFile(new URL("../data/companies.json", import.meta.url), "utf8"),
) as { companies: CompanyEntry[] };

for (const c of companies) {
  let status = "";
  try {
    const allowed = await isAllowed(c.url);
    const res = await fetch(c.url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    status = `${res.status}${allowed ? "" : " robots で禁止"}${res.url !== c.url ? ` → ${res.url}` : ""}`;
  } catch (e) {
    status = `失敗 ${(e as Error).message}`;
  }
  console.log(`${c.enabled ? "  " : "× "}${c.id.padEnd(24)} ${status}`);
}
