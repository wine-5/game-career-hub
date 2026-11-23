// 会社・募集の検索。表記ゆれ（ひらがな/カタカナ・濁点・小さい文字・伸ばし棒・全角半角）と
// 少しの打ち間違いを許して当てる。
import type { CompanyResult } from "../types.ts";

const SMALL: Record<string, string> = { ぁ: "あ", ぃ: "い", ぅ: "う", ぇ: "え", ぉ: "お", っ: "つ", ゃ: "や", ゅ: "ゆ", ょ: "よ", ゎ: "わ", ゕ: "か", ゖ: "け" };

/** 比べるための形にそろえる（例: 「セガ」「せか」「ｾｶﾞ」→「せか」） */
export function fold(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60)) // カタカナ→ひらがな
    .normalize("NFD")
    .replace(/[゙゚̀-ͯ]/g, "") // 濁点・半濁点・アクセントを外す
    .normalize("NFC")
    .replace(/[ぁぃぅぇぉっゃゅょゎゕゖ]/g, (ch) => SMALL[ch])
    .replace(/株式会社|有限会社|合同会社|\(株\)|inc\.?|co\.,?\s?ltd\.?|corporation/g, "")
    .replace(/[\s・\-ー‐―~〜_.,、。・'’"()（）「」『』【】!！?？&＆]/g, "");
}

/** 2 つの文字列の違いの数（打ち間違いの許容に使う。短い文字列だけで使う） */
function distance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** 打った文字が順番どおりに含まれるか（「すくえに」→「すくうえあえにつくす」） */
function inOrder(q: string, s: string): boolean {
  let i = 0;
  for (const ch of s) if (ch === q[i]) i++;
  return i === q.length;
}

/** 検索語と、比べる文字列（名前・英字の ID・サイトの住所など）の当たり具合。0 は当たらない */
export function score(query: string, targets: string[]): number {
  const q = fold(query);
  if (!q) return 1;
  let best = 0;
  for (const t of targets) {
    const s = fold(t);
    if (!s) continue;
    if (s === q) return 10;
    if (s.startsWith(q)) best = Math.max(best, 8);
    else if (s.includes(q)) best = Math.max(best, 6);
    else if (q.length >= 3 && inOrder(q, s)) best = Math.max(best, 3);
    else if (q.length >= 3) {
      // 頭の部分と比べて、1〜2 文字の打ち間違いまで許す
      const d = distance(q, s.slice(0, q.length));
      if (d <= (q.length >= 6 ? 2 : 1)) best = Math.max(best, 2);
    }
  }
  return best;
}

/** 会社を探すときに比べる文字列（名前・ID・サイトの住所・タグ・所在地） */
export function companyTargets(c: Pick<CompanyResult, "name" | "id" | "site" | "url" | "tags" | "locations">): string[] {
  const host = (u?: string) => {
    try {
      return u ? new URL(u).hostname.replace(/^www\./, "").split(".")[0] : "";
    } catch {
      return "";
    }
  };
  return [c.name, c.id, host(c.site), host(c.url), ...c.tags, ...(c.locations ?? [])];
}

/** 名前から一覧の会社を探す（表記ゆれは許すが、打ち間違いまでは許さない）。見つからなければ undefined */
export function findCompany<T extends Pick<CompanyResult, "name" | "id" | "site" | "url" | "tags" | "locations">>(name: string, companies: Iterable<T>): T | undefined {
  const q = fold(name);
  if (!q) return undefined;
  let best: T | undefined;
  let bestScore = 0;
  for (const c of companies) {
    if (fold(c.name) === q) return c;
    // 名前・英字の ID・サイトの住所の頭が一致する物だけ（タグや所在地では当てない）
    const s = score(name, [c.name, c.id]);
    if (s >= 8 && s > bestScore) {
      best = c;
      bestScore = s;
    }
  }
  return best;
}
