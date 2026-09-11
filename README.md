# モペョ初号機 v0.1

スマートフォン向けの、少し変な帰り道と謎の生物との遭遇を体験するプロトタイプです。

## 起動

Node.js 20 以降で、外部サービスや追加パッケージなしに起動できます。

```sh
npm run dev
```

ブラウザで `http://localhost:4173` を開いてください。同じブラウザでは進行状況が保持されます。

## 確認

```sh
npm test
npm run build
```

## PR Preview

- `main` への push で GitHub Pages の本番用ルートを `gh-pages` ブランチへ更新します。
- PR の `opened` / `synchronize` / `reopened` でレビュー用Previewを `previews/pr-<PR番号>/` に更新し、URLをPRコメントへ自動で残します。`gh-pages` 未作成時もPRイベントでは本番ルートを作らず、ルートには `.nojekyll` だけを置きます。`main` からの本番公開がまだ一度も行われていない間は、PR更新ごとにルートを `.nojekyll` のみに戻してから Preview だけを更新します。
- PR を閉じると対応する Preview は削除されます。
- `gh-pages` への書き込みはPreview更新・cleanup・`main`公開をすべて同じ workflow concurrency group で直列化し、進行中jobの取消しもしません。各writerは毎回「同一repositoryで現在openかつ非draftのPR一覧」を見て preview 群全体を再構築するため、pending の cleanup / publish が後続runに置換されても最新runで状態が収束します。
- 権限付きのPages更新jobでは、このrepository内の信頼済みworkflow手順だけを実行し、PR headからは `index.html` と `src/` を `git archive` で取得してPreview入力に使います。PR側の `scripts/*.js` は公開処理として実行しません。
- Preview URL は本番と同じ origin (`https://sousei-yamashita.github.io`) 配下ですが、Preview では `localStorage` を使わず `sessionStorage` の同じ key (`mopyo-v01-journey`) だけを使います。そのため本番保存データは読み書きされず、Previewの進行は同じタブの再読み込みまで保持され、タブを閉じると消えます。
- 初回のみ、GitHub Pages の公開元を `gh-pages` ブランチの `/ (root)` に設定してください。
