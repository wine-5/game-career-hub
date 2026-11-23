# Game Career Hub

ゲーム業界を目指す人のための、**インターン・新卒採用の一覧サイト**です。
各社の公式の採用ページを、指示したときに Claude Code が確認し、変わった会社だけ読み取って、
**プログラマー・プランナー・エフェクトデザイナー（とアーティスト）** 向けの募集を一覧にします。
対象の卒業年は `data/settings.json`（いまは 28 卒）。

公開ページ: https://wine-5.github.io/game-career-hub/

- 見るだけならログインは要りません
- ★ お気に入りを保存して一覧で見るときだけログインします（Supabase。未設定でも閲覧は動きます）

## 更新のしかた（スマホからでも）

Claude アプリの **Claude Code** でこのリポジトリを開き、**「更新して」** と送るだけです。
手順は [CLAUDE.md](CLAUDE.md) に書いてあり、Claude Code がそれに従って動きます。

```
「更新して」
  1. npm run collect   各社の採用ページを取得（robots.txt を守る）。前回から変わった会社だけ .work/ に書き出す
  2. Claude Code       書き出したページを crawler/EXTRACTION_RULES.md に従って読み、募集を JSON に整理
  3. npm run apply     整理した JSON を確かめて public/data/jobs.json に取り込む
  4. commit → push     GitHub Actions が GitHub Pages に公開（1〜2 分）
```

- API キーは要りません（Claude の契約の利用枠で動きます）。変化した会社だけ読むので、2 回目以降は軽く済みます
- 「〇〇社を追加して」「全部読み直して」「セガとカプコンだけ更新して」なども通じます
- クラウドの Claude Code で取得が全部失敗するときは、環境のネットワーク設定で外部サイトへのアクセスを許可してください

### API で自動更新する経路（予備）

`npm run crawl:api`（`ANTHROPIC_API_KEY` が要る）で、整理まで Claude API に任せることもできます。
GitHub では Actions の画面から **Run workflow** したときだけ動きます（Secret `ANTHROPIC_API_KEY`、Variable `CLAUDE_MODEL` は任意で既定は `claude-opus-5-5`）。

## 置き場

| 場所 | 中身 |
| --- | --- |
| `data/companies.json` | 監視する会社。**会社を増やすときはここだけ触る** |
| `crawler/` | 取得（`fetch.ts`）・書き出し（`collect.ts`）・取り込み（`apply.ts`）・読み取りの決まり（`EXTRACTION_RULES.md`）・API の経路（`crawl.ts`） |
| `public/data/jobs.json` | 収集の結果。サイトはこれを読む |
| `src/` | サイト本体（Vite + React + TypeScript） |
| `supabase/schema.sql` | お気に入りの表（ログイン機能を使うとき） |
| `public/assets/logos/` | 会社のロゴ（各社サイトのアイコン。個人で使う前提） |

## 手元で動かす

VS Code で **F5** を押すと開発サーバーが起動し、ブラウザでサイトが開きます。

```bash
npm install
npm run dev            # http://localhost:5173/game-career-hub/
npm run check-urls     # 会社の URL が生きているか確認
npm run collect        # 採用ページを取得して、変わった会社を .work/ に書き出す
npm run apply          # .work/extracted/ の整理結果を取り込む
npm run discover       # 会社の新卒・インターン・企業理念のページとロゴを探す
npm run sync           # data/companies.json の会社情報を jobs.json に写す
```

## 会社を増やす

Claude Code に「〇〇社を追加して」と頼むか、手で次のようにします。

1. `data/companies.json` に 1 行足す（`id` は英小文字とハイフン）
   ```json
   { "id": "example-games", "name": "Example Games", "tags": ["モバイル"], "url": "https://example.co.jp/recruit/", "enabled": true }
   ```
2. `npm run check-urls` で 200 が返るか、robots.txt で禁止されていないかを確かめる
3. `npm run discover -- --only=example-games` でページとロゴを探し、`npm run sync`
4. コミットして、次の「更新して」から対象になる

- 自動アクセスを断るサイト（403）や、robots.txt で禁止のサイトは `"enabled": false` にして `note` に理由を書く
- 友人からの提案は Issue の「会社の追加」テンプレートで受け付ける

## ログイン機能（お気に入り）を有効にする

1. [Supabase](https://supabase.com/) で無料のプロジェクトを作る
2. SQL Editor で `supabase/schema.sql` を実行する
3. Authentication → Providers で GitHub / Google / Email を有効にする
4. Authentication → URL Configuration の Site URL と Redirect URLs に `https://wine-5.github.io/game-career-hub/` と `http://localhost:5173/game-career-hub/` を入れる
5. Project Settings → API の URL と anon キーを、GitHub の Settings → Secrets and variables → Actions の Variables（`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`）に入れる

## 注意

- 掲載するのは AI がまとめた要約と、公式ページへのリンクだけです。本文は転載しません
- AI の読み取りには誤りがあります。応募の前に必ず公式ページを確認してください
- 大手の就活サイト（リクナビ・マイナビなど）は利用規約で自動取得を禁止しているため、対象にしていません
