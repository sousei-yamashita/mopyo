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
- PR の `opened` / `synchronize` / `reopened` でレビュー用Previewを `previews/pr-<PR番号>/` に更新し、URLをPRコメントへ自動で残します。
- PR を閉じると対応する Preview は削除されます。
- 初回のみ、GitHub Pages の公開元を `gh-pages` ブランチの `/ (root)` に設定してください。
