// 採用ページ（.work/pages/<id>.md）に書かれている言語・エンジンを拾い、public/data/tech.json に書く。
// 推測はしない。ページの本文に名前が出てくる物だけを、出てきたページの URL（出典）つきで載せる。
// collect の最後に呼ばれる。単独でも `npm run tech` で動く。
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { TechData, TechItem, TechKind } from "../src/types.ts";
import { readJson, ROOT, writeJson } from "./shared.ts";

const TECH_FILE = path.join(ROOT, "public", "data", "tech.json");

/** 拾う名前と、本文での書かれ方（NFKC でそろえた本文に当てる） */
const DICT: { name: string; kind: TechKind; re: RegExp }[] = [
  { name: "Unreal Engine", kind: "engine", re: /unreal\s?engine|\bUE[45]\b|アンリアルエンジン/i },
  { name: "Unity", kind: "engine", re: /\bUnity\b/ },
  { name: "自社エンジン", kind: "engine", re: /自社(製)?エンジン|独自(の)?(ゲーム)?エンジン|内製(の)?(ゲーム)?エンジン/ },
  { name: "Godot", kind: "engine", re: /\bGodot\b/i },
  { name: "Cocos2d-x", kind: "engine", re: /cocos2d-?x/i },
  { name: "C++", kind: "lang", re: /C\+\+/ },
  { name: "C#", kind: "lang", re: /C#(?![a-z])/i },
  { name: "Python", kind: "lang", re: /\bPython\b/i },
  { name: "TypeScript", kind: "lang", re: /\bTypeScript\b/i },
  { name: "JavaScript", kind: "lang", re: /\bJavaScript\b/i },
  { name: "Java", kind: "lang", re: /\bJava\b(?!\s?Script)/ },
  { name: "Kotlin", kind: "lang", re: /\bKotlin\b/ },
  { name: "Swift", kind: "lang", re: /\bSwift\b/ },
  { name: "Go", kind: "lang", re: /Go言語|\bGolang\b/i },
  { name: "Rust", kind: "lang", re: /\bRust\b/ },
  { name: "Lua", kind: "lang", re: /\bLua\b/ },
  { name: "HLSL", kind: "gfx", re: /\bHLSL\b/ },
  { name: "GLSL", kind: "gfx", re: /\bGLSL\b/ },
  { name: "DirectX", kind: "gfx", re: /\bDirect\s?X\b|\bDirect3D\b/i },
  { name: "Vulkan", kind: "gfx", re: /\bVulkan\b/ },
];

/** 1 社ぶんのページの束から、名前ごとに最初に出てきたページを出典にして並べる */
export function scanTech(md: string): TechItem[] {
  const found = new Map<string, TechItem>();
  for (const part of md.split(/\n---\n/)) {
    const url = part.match(/^## ページ: (\S+)/m)?.[1];
    if (!url) continue;
    const text = part.normalize("NFKC");
    for (const d of DICT) if (!found.has(d.name) && d.re.test(text)) found.set(d.name, { name: d.name, kind: d.kind, sourceUrl: url });
  }
  // 辞書の順（エンジン → 言語 → グラフィックス）で返す
  return DICT.map((d) => found.get(d.name)).filter((x): x is TechItem => Boolean(x));
}

/** .work/pages にある会社だけ書き直す（無い会社は前回のまま） */
export async function updateTech(pagesDir = path.join(ROOT, ".work", "pages")): Promise<number> {
  const data = await readJson<TechData>(TECH_FILE, { updatedAt: "", companies: {} });
  let files: string[] = [];
  try {
    files = (await readdir(pagesDir)).filter((f) => f.endsWith(".md"));
  } catch {
    return 0;
  }
  for (const f of files) {
    const id = f.slice(0, -3);
    const items = scanTech(await readFile(path.join(pagesDir, f), "utf8"));
    if (items.length) data.companies[id] = items;
    else delete data.companies[id];
  }
  data.updatedAt = new Date().toISOString();
  await writeJson(TECH_FILE, data);
  return files.length;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("crawler/tech.ts")) {
  const n = await updateTech();
  const data = await readJson<TechData>(TECH_FILE, { updatedAt: "", companies: {} });
  console.log(`${n} 社のページを見て、${Object.keys(data.companies).length} 社に言語・エンジンが見つかりました`);
}
