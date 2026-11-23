// Claude で採用ページの文章から募集を取り出す
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { RULES_FILE, type Extracted } from "./shared.ts";

export const MODEL = process.env.CLAUDE_MODEL?.trim() || "claude-opus-5-5";

// 拒否されたときに別のモデルで続ける仕組み（server-side fallback）が使えるモデル
const SUPPORTS_FALLBACK = /^claude-(opus-5|sonnet-5-5|fable-5)/.test(MODEL);


const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["digest", "previous", "openings"],
  properties: {
    previous: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["text", "sourceUrl"],
          properties: {
            text: { type: "string", description: "前の年の卒業生の募集の開始時期（50 字以内。卒業年と年月を入れる）" },
            sourceUrl: { type: "string" },
          },
        },
        { type: "null" },
      ],
    },
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
          flowSourceUrl: { type: "string", description: "選考の流れが書かれていたページの URL。flow が空なら空文字" },
          flowNote: { type: "string", description: "流れが対象の卒業年の物と言い切れない時の注意（例: 27卒の選考フロー）。無ければ空文字" },
          flow: {
            type: "array",
            description: "選考の流れ。ページに書かれている時だけ。無ければ空の配列",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["kind", "label"],
              properties: {
                kind: { type: "string", enum: ["entry", "briefing", "es", "portfolio", "assignment", "test", "groupwork", "interview", "final", "offer", "other"] },
                label: { type: "string" },
                roles: { type: "array", items: { type: "string", enum: ["programmer", "planner", "effect", "artist", "other"] } },
              },
            },
          },
        },
      },
    },
  },
} as const;

// 決まりは Claude Code で整理するときと同じ文書を使う
const SYSTEM = `あなたはゲーム業界の採用情報を整理するアシスタントです。
次の決まりに従い、渡された採用ページから募集を JSON で取り出してください。

${readFileSync(RULES_FILE, "utf8")}`;

let client: Anthropic | null = null;

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export async function extract(
  companyName: string,
  pages: { url: string; title: string; text: string }[],
  today: string,
  targetYear: number,
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
        content: `今日の日付: ${today}\n対象の卒業年: ${targetYear}\n会社名: ${companyName}\n\n以下がこの会社の採用ページです。\n\n${body}`,
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
