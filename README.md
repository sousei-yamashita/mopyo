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

- GitHub Pages の公開は branch push ではなく、GitHub 公式の `actions/upload-pages-artifact` / `actions/deploy-pages` を使う custom workflow で行います。
- PR側のCIは read-only のままです。Pages への公開とPRコメント更新は、successful CI の後に default branch 側の trusted workflow 定義からだけ実行します。
- `main` の successful CI 後に本番ルートを更新し、レビュー可能なPRの successful CI 後に `previews/pr-<PR番号>/` を更新します。`gh-pages` は公開状態の再構築用stateとして保持します。
- PR を閉じるか draft に戻すと対応する Preview は削除されます。
- Preview集合は毎回「同一repositoryで現在openかつ非draftのPR一覧」から再構築するため、pending の cleanup / publish が後続runに置換されても最新runで状態が収束します。
- 権限付きの公開処理は PR head の workflow / script を実行せず、trusted workflow から `index.html` と `src/` だけを `git archive` で取得して Pages artifact を作成します。
- Preview URL は本番と同じ origin (`https://sousei-yamashita.github.io`) 配下です。アプリ実装としてはPreviewで `localStorage` を使わず `sessionStorage` の同じ key (`mopyo-v01-journey`) のみを使うため、通常の操作では本番保存データを読み書きしません。ただし同一origin上のPRコード自体を信頼境界として分離するものではありません。Previewの進行は同じタブの再読み込みまで保持され、タブを閉じると消えます。
- 初回のみ、GitHub Pages の公開元を GitHub Actions に設定してください。

## Copilot Review NG の自動中継

- `pull_request_review: submitted` で `copilot-pull-request-reviewer[bot]` のレビューだけを監視します。
- `Changes recommended` または指摘コメントがある場合、PR Conversation に `@copilot` 宛ての修正依頼を自動投稿します（レビュー本文と取得できた指摘コメントを添付）。
- 同一 review/head の重複投稿は抑止し、固定上限回数（3回）を超えると自動中継を停止して人間判断待ちを明示します。
