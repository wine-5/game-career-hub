# Game Career Hub

ゲーム業界を目指す人のための、**インターン・新卒採用の一覧サイト**です。
各社の公式の採用ページを毎日自動で確認し、変わった会社だけ AI（Claude）が読み取って、
**プログラマー・プランナー・エフェクトデザイナー（とアーティスト）** 向けの募集を一覧にします。

公開ページ: https://wine-5.github.io/game-career-hub/

- 見るだけならログインは要りません
- ★ お気に入りを保存して一覧で見るときだけログインします（Supabase。未設定でも閲覧は動きます）

## 仕組み

```
data/companies.json（監視する会社の一覧）
      │  GitHub Actions が毎日 6:00（日本時間）に実行
      ▼
crawler/crawl.ts
  1. robots.txt を確認して、入口ページと新卒・インターンらしい下のページ（最大 4 件）を取得
  2. 中身の hash を前回（data/state.json）と比べ、変わった会社だけ Claude に渡す
  3. 募集・締切・対象の職種・卒業年を構造化して取り出す
      ▼
public/data/jobs.json → Vite でビルド → GitHub Pages に公開
```

| 場所 | 中身 |
| --- | --- |
| `data/companies.json` | 監視する会社。**会社を増やすときはここだけ触る** |
| `crawler/` | 取得（`fetch.ts`）・AI での読み取り（`extract.ts`）・全体の流れ（`crawl.ts`） |
| `public/data/jobs.json` | 収集の結果。サイトはこれを読む（Actions が自動でコミット） |
| `src/` | サイト本体（Vite + React + TypeScript） |
| `supabase/schema.sql` | お気に入りの表（ログイン機能を使うとき） |
| `public/assets/` | アイコン（Kenney, CC0）・エフェクトの絵（WineEngine VFX, CC0） |

## 手元で動かす

```bash
npm install
npm run dev            # http://localhost:5173/game-career-hub/
npm run check-urls     # 会社の URL が生きているか確認
npm run crawl:dry      # 取得だけ（AI を呼ばない）
ANTHROPIC_API_KEY=sk-... npm run crawl -- --only=sega,capcom   # 指定した会社だけ AI で整理
```

`.env.example` を `.env` に写して値を入れても動きます。

## 会社を増やす

1. `data/companies.json` に 1 行足す（`id` は英小文字とハイフン）
   ```json
   { "id": "example-games", "name": "Example Games", "tags": ["モバイル"], "url": "https://example.co.jp/recruit/", "enabled": true }
   ```
2. `npm run check-urls` で 200 が返るか、robots.txt で禁止されていないかを確かめる
3. コミットして push。次の毎朝の収集から対象になる（すぐ見たいときは Actions の画面から **Run workflow**）

- 自動アクセスを断るサイト（403）や、robots.txt で禁止のサイトは `"enabled": false` にして `note` に理由を書く
- 友人からの提案は Issue の「会社の追加」テンプレートで受け付ける

## GitHub での設定

**Settings → Secrets and variables → Actions**

| 種類 | 名前 | 内容 |
| --- | --- | --- |
| Secret | `ANTHROPIC_API_KEY` | Claude の API キー（必須。無いと取得だけして AI の整理を飛ばす） |
| Variable | `CLAUDE_MODEL` | 使うモデル（任意。既定は `claude-opus-5-5`。費用を抑えるなら `claude-haiku-5-5`） |
| Variable | `VITE_SUPABASE_URL` | ログイン機能を使うとき |
| Variable | `VITE_SUPABASE_ANON_KEY` | ログイン機能を使うとき（公開してよい anon キー） |

**Settings → Pages** の Source は **GitHub Actions**。

### 費用の目安

変化した会社だけ AI に渡すので、2 回目以降は数社ぶんの呼び出しで済みます。
初回は全社（約 20 社 × 最大 5 ページ）を読むため、いちばん多くかかります。

## ログイン機能（お気に入り）を有効にする

1. [Supabase](https://supabase.com/) で無料のプロジェクトを作る
2. SQL Editor で `supabase/schema.sql` を実行する
3. Authentication → Providers で GitHub / Google / Email を有効にする
4. Authentication → URL Configuration の Site URL と Redirect URLs に `https://wine-5.github.io/game-career-hub/` と `http://localhost:5173/game-career-hub/` を入れる
5. Project Settings → API の URL と anon キーを、上の Variables に入れる

## 注意

- 掲載するのは AI がまとめた要約と、公式ページへのリンクだけです。本文は転載しません
- AI の読み取りには誤りがあります。応募の前に必ず公式ページを確認してください
- 大手の就活サイト（リクナビ・マイナビなど）は利用規約で自動取得を禁止しているため、対象にしていません
