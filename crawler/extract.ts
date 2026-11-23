// Claude で採用ページの文章から募集を取り出す
import Anthropic from "@anthropic-ai/sdk";
import type { OpeningType, Role, WorkFormat } from "../src/types.ts";

export const MODEL = process.env.CLAUDE_MODEL?.trim() || "claude-opus-5-5";

// 拒否されたときに別のモデルで続ける仕組み（server-side fallback）が使えるモデル
const SUPPORTS_FALLBACK = /^claude-(opus-5|sonnet-5-5|fable-5)/.test(MODEL);

export interface ExtractedOpening {
  title: string;
  type: OpeningType;
  roles: Role[];
  graduationYears: number[];
  applyStart: string;
  deadline: string;
  period: string;
  format: WorkFormat;
  location: string;
  summary: string;
  sourceUrl: string;
}

export interface Extracted {
  digest: string;
  openings: ExtractedOpening[];
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["digest", "openings"],
  properties: {
    digest: {
      type: "string",
      description: "この会社の新卒・インターン採用の現状を 1〜2 文で。情報が無ければ空文字",
    },
    openings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title", "type", "roles", "graduationYears", "applyStart", "deadline",
          "period", "format", "location", "summary", "sourceUrl",
        ],
        properties: {
          title: { type: "string", description: "募集・イベントの名前（ページの表記のまま短く）" },
          type: { type: "string", enum: ["internship", "newgrad", "event", "other"] },
          roles: {
            type: "array",
            items: { type: "string", enum: ["programmer", "planner", "effect", "artist", "other"] },
          },
          graduationYears: { type: "array", items: { type: "integer" } },
          applyStart: { type: "string", description: "YYYY-MM-DD。不明なら空文字" },
          deadline: { type: "string", description: "YYYY-MM-DD。不明なら空文字" },
          period: { type: "string", description: "開催期間・選考時期など。不明なら空文字" },
          format: { type: "string", enum: ["online", "onsite", "hybrid", "unknown"] },
          location: { type: "string", description: "開催地・勤務地。不明なら空文字" },
          summary: { type: "string", description: "内容の要約を 80 字以内で。原文を写さない" },
          sourceUrl: { type: "string", description: "その募集が書かれていたページの URL（下の候補から選ぶ）" },
        },
      },
    },
  },
} as const;

const SYSTEM = `あなたはゲーム業界の採用情報を整理するアシスタントです。
ゲーム会社の採用ページの文章を読み、学生向けの「新卒採用」「インターンシップ」「説明会・イベント」を取り出します。

決まり:
- 中途採用・経験者採用・アルバイトは含めない。
- ページに書かれていることだけを使う。推測で日付や職種を作らない。分からない項目は空文字（format は unknown）。
- 日付は今日の日付をもとに年を補って YYYY-MM-DD にする。「随時」「未定」は空文字。
- roles の分類:
  - programmer: プログラマー・エンジニア（クライアント、サーバー、ゲームプログラマー、テクニカルアーティストのうちプログラム寄りの物）
  - planner: プランナー・ゲームデザイナー・ディレクター・シナリオ
  - effect: エフェクトデザイナー・VFX アーティスト（「デザイナー職」の中にエフェクトが明記されている場合も含む）
  - artist: 2D/3D のデザイナー・アーティスト・アニメーター・UI デザイナー・背景・キャラクター
  - other: サウンド、プロデューサー、ビジネス職など上に当てはまらない物
  1 つの募集が複数の職種に当てはまるなら全部入れる。「デザイナー職」でエフェクトが明記されていなければ artist だけにする。
- graduationYears は「2028年卒」「28卒」などから西暦の卒業年を入れる。
- summary は自分の言葉で短く要約する（著作権に配慮し、原文を長く写さない）。
- 学生向けの募集がページに無ければ openings は空の配列にする。`;

let client: Anthropic | null = null;

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export async function extract(
  companyName: string,
  pages: { url: string; title: string; text: string }[],
  today: string,
): Promise<Extracted> {
  client ??= new Anthropic();

  const body = pages
    .map((p) => `<page url="${p.url}" title="${p.title.replace(/"/g, "'")}">\n${p.text}\n</page>`)
    .join("\n\n");

  const params = {
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: {
      effort: "low" as const,
      format: { type: "json_schema" as const, schema: SCHEMA },
    },
    messages: [
      {
        role: "user" as const,
        content: `今日の日付: ${today}\n会社名: ${companyName}\n\n以下がこの会社の採用ページです。\n\n${body}`,
      },
    ],
  };

  const response = SUPPORTS_FALLBACK
    ? await client.beta.messages.create({
        ...params,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      })
    : await client.beta.messages.create(params);

  if (response.stop_reason === "refusal") throw new Error("AI が処理を断った（refusal）");
  if (response.stop_reason === "max_tokens") throw new Error("AI の出力が長すぎて途中で切れた");

  const text = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
  const parsed = JSON.parse(text) as Extracted;
  return parsed;
}
