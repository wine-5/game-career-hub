// 候補の会社（名前と公式サイト）から採用ページを探し、data/companies.json に足す。
// 新卒・インターンの言葉が採用ページに無い会社は、一覧には載せるが収集の対象外（enabled: false）にする。
//
//   npm run add-companies -- <候補の JSON> [--tags=開発会社,札幌] [--locations=北海道]
//   候補の JSON: [{ "name": "株式会社〇〇", "site": "https://example.co.jp/", "tags": ["モバイル"], "pref": "東京" }, ...]
import { readFile } from "node:fs/promises";
import type { CompanyEntry } from "../src/types.ts";
import { fetchPage, isAllowed, type FetchedPage } from "./fetch.ts";
import { loadCompanyList, saveCompanyList, sleep, WAIT_MS } from "./shared.ts";

interface Candidate {
  name: string;
  site: string;
  tags?: string[];
  /** 分かっていれば本社・スタジオの都道府県（「東京」「北海道」。複数はカンマ区切り） */
  pref?: string;
}

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("使い方: npm run add-companies -- <候補の JSON> [--tags=開発会社]");
  process.exit(1);
}
const extraTags = argv.find((a) => a.startsWith("--tags="))?.slice(7).split(",").filter(Boolean) ?? [];
// 候補の出どころで所在地が分かっているとき（例: 札幌の会社の一覧）に最初から入れておく
const presetLocations = argv.find((a) => a.startsWith("--locations="))?.slice(12).split(",").filter(Boolean);

// 就活ナビ・求人まとめのサイトは規約で自動取得が禁止のことが多いので、採用ページとして使わない
const AGGREGATORS = /mynavi|rikunabi|wantedly|onecareer|offerbox|en-japan|doda|green-japan|indeed|type\.jp|bizreach|gamecreators|career-tasu|labbase|unistyle/i;
const RECRUIT_TEXT = /採用|リクルート|recruit|careers?|求人|募集|jobs?/i;
const RECRUIT_URL = /recruit|career|jobs?|saiyo/i;
const STUDENT = /新卒|インターン|卒業見込|学生|Graduate|intern/i;

/** 会社名から余計な語を除いて比べやすくする */
const normName = (n: string) => n.replace(/株式会社|有限会社|合同会社|\(株\)|（株）|\s/g, "").toLowerCase();

/** ホスト名から ID を作る（例: www.arcsystemworks.jp → arcsystemworks） */
function idFromHost(host: string): string {
  const parts = host.replace(/^www\./, "").split(".");
  const tld = new Set(["jp", "com", "net", "co", "org", "inc", "io", "games", "info", "biz", "tokyo", "ne", "or", "dev", "studio", "tv"]);
  while (parts.length > 1 && tld.has(parts[parts.length - 1])) parts.pop();
  return parts.join("-").toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "company";
}

function findRecruitLink(page: FetchedPage): string | undefined {
  const scored = new Map<string, number>();
  for (const l of page.links) {
    if (!/^https?:/.test(l.href) || AGGREGATORS.test(l.href)) continue;
    let s = 0;
    if (RECRUIT_TEXT.test(l.text)) s += 3;
    if (RECRUIT_URL.test(new URL(l.href).pathname) || /^recruit\.|^careers?\./.test(new URL(l.href).host)) s += 2;
    if (/新卒/.test(l.text)) s += 2;
    if (/中途|キャリア採用|アルバイト|パートナー|協力会社|外注|取引/.test(l.text)) s -= 3;
    if (s >= 3) scored.set(l.href, Math.max(s, scored.get(l.href) ?? 0));
  }
  return [...scored.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

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

const candidates = JSON.parse(await readFile(file, "utf8")) as Candidate[];
const data = await loadCompanyList();
const hosts = new Set(
  data.companies.flatMap((c) => [c.url, c.site].filter(Boolean).map((u) => new URL(u!).host.replace(/^www\./, ""))),
);
const names = new Set(data.companies.map((c) => normName(c.name)));
const ids = new Set(data.companies.map((c) => c.id));
let added = 0;

for (const cand of candidates) {
  let site: URL;
  try {
    site = new URL(cand.site);
  } catch {
    console.warn(`× ${cand.name}: サイトの URL が読めない`);
    continue;
  }
  const host = site.host.replace(/^www\./, "");
  if (hosts.has(host) || names.has(normName(cand.name))) continue; // もう載っている
  let id = idFromHost(site.host);
  for (let i = 2; ids.has(id); i++) id = `${idFromHost(site.host)}-${i}`;

  const entry: CompanyEntry = {
    id,
    name: cand.name.replace(/株式会社|有限会社|合同会社/g, "").replace(/\s+/g, " ").trim(),
    tags: [...new Set([...(cand.tags ?? []), ...extraTags])],
    url: site.toString(),
    site: site.origin + "/",
    enabled: false,
    ...(presetLocations || cand.pref
      ? { locations: [...new Set([...(presetLocations ?? []), ...(cand.pref ?? "").split(",").filter(Boolean).map((p) => p.trim().replace(/[都府県]$/, ""))])] }
      : {}),
  };

  const top = await tryFetch(site.toString());
  if (!top) {
    entry.note = "公式サイトを自動で読めない（robots.txt の禁止や拒否など）";
  } else {
    const recruitUrl = findRecruitLink(top);
    const recruit = recruitUrl ? await tryFetch(recruitUrl) : null;
    if (!recruitUrl) {
      entry.note = "公式サイトに採用ページが見当たらない";
    } else if (!recruit) {
      entry.url = recruitUrl;
      entry.note = "採用ページを自動で読めない";
    } else {
      entry.url = recruit.url;
      // 採用ページか、そこから 1 段先のリンクに学生向けの言葉があれば収集の対象にする
      const student = STUDENT.test(recruit.text) || recruit.links.some((l) => STUDENT.test(l.text));
      entry.enabled = student;
      if (!student) entry.note = "新卒・インターンの募集が見当たらない（中途採用のみの可能性）";
    }
  }

  data.companies.push(entry);
  hosts.add(host);
  names.add(normName(cand.name));
  ids.add(id);
  added++;
  console.log(`${entry.enabled ? "○" : "△"} ${entry.name} (${entry.id}) ${entry.url}${entry.note ? ` — ${entry.note}` : ""}`);
  await saveCompanyList(data);
}
console.log(`\n${added} 社を足した。次: npm run discover（ページ・ロゴ・所在地）→ npm run sync`);
