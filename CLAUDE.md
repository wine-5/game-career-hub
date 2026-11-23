# Game Career Hub — Claude への指示書

ゲーム業界向けのインターン・新卒採用の一覧サイト。公開先は https://wine-5.github.io/game-career-hub/ 。
データは **利用者が「更新して」と指示したときだけ**、Claude Code（あなた）が各社の採用ページを読んで整理する。
利用者はスマホの Claude アプリから指示することが多いので、**報告は短く、スマホで読みやすく**。

## 「更新して」と言われたら

1. 最新にする: `git pull` → `node_modules` が無ければ `npm ci`
2. ページを取る: `npm run collect`
   - 会社を指定されたら `npm run collect -- --only=sega,capcom`（id は `data/companies.json`）
   - 「全部読み直して」なら `--force`
   - ほぼ全社が「fetch failed」等で失敗したら、クラウド環境のネットワーク制限が原因。利用者に「環境のネットワーク設定で外部サイトへのアクセスを許可してください」と伝えて止まる
3. 整理する: `.work/todo.json` の `todo` の会社ごとに
   - `pagesFile` を読み、**`crawler/EXTRACTION_RULES.md` の決まりに従って** `extractedFile` に JSON を書く
   - 会社が 6 社を超えるときは、サブエージェントに数社ずつ分けて並行で整理させてよい（決まりの文書のパスと、担当する pagesFile / extractedFile を渡す）
   - ページに学生向けの募集が無ければ `{"digest": "", "openings": []}` を書く（書かないと次回また出てくる）
4. 取り込む: `npm run apply`
   - 形の誤りが出たら、その会社の JSON を直して `npm run apply` をもう一度
5. 確かめる: `npm run build` が通ること
6. コミットして push（**この手順の push は利用者が許可済み**）
   - `git add public/data/jobs.json data/state.json` だけ
   - メッセージ例: `chore: 募集データを更新（3社）`
   - `git push origin main`。push すると Actions が GitHub Pages に公開する（1〜2 分）
7. 報告（短く）:
   - 変化のあった会社と、新しく見つかった募集（apply の出力を使う）
   - 7 日以内に締切の募集
   - 取得に失敗した会社（`.work/todo.json` の `failed`）
   - 最後に公開ページの URL

## 「〇〇社を追加して」と言われたら

1. 公式の新卒・インターンの採用ページの URL を探す（就活ナビサイトではなく会社の公式）
2. `data/companies.json` に 1 件足す（`id` は英小文字とハイフン、`tags` は既存の分類から）
3. `npm run check-urls` で 200 が返り、robots.txt で禁止されていないことを確かめる。403 や禁止なら `"enabled": false` と `note` に理由
4. `feat: 〇〇を監視対象に追加` でコミット → 続けて「更新して」の手順をその会社だけ（`--only=<id>`）で行う

## 置き場

| 場所 | 中身 |
| --- | --- |
| `data/companies.json` | 監視する会社 |
| `data/state.json` | 会社ごとの「最後に整理した時のページの hash」（apply が書く） |
| `public/data/jobs.json` | サイトが読むデータ（collect と apply が書く。手で書かない） |
| `crawler/EXTRACTION_RULES.md` | 募集の取り出し方の決まり（API の経路とも共通） |
| `crawler/collect.ts` → `apply.ts` | Claude Code で更新する経路 |
| `crawler/crawl.ts` | API で自動更新する経路（`npm run crawl:api`、ANTHROPIC_API_KEY が要る。ふだんは使わない） |
| `.work/` | 収集の途中の物（git に入れない） |
| `src/` | サイト本体（Vite + React + TypeScript） |

## 守ること

- 掲載するのは要約とリンクだけ。ページの本文を長く写さない
- robots.txt で禁止・403 のサイトに、別の手段でアクセスしようとしない
- 大手の就活ナビサイト（リクナビ・マイナビ等）は対象にしない（規約で自動取得が禁止）
- ページに無い日付や職種を推測で作らない

## コミットの決まり

- Conventional Commits の `<type>: <subject>`。日本語・一行・命令形・末尾のピリオドなし・50 文字以内。スコープは付けない
- Co-Authored-By などのトレーラーは書かない
- 見た目だけの調整は `style:`、データやパラメータの更新は `chore:`、不具合修正だけ `fix:`
- 1 コミット＝1 つの小さな部品・観点。実装したらすぐコミットする
- `git add -A` / `git add .` / `git commit -a` は使わず、変えたファイルを明示して add する
- **push は「更新して」の手順と、利用者が明示したときだけ**
