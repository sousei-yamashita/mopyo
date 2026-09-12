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

## Copilot review autofix handoff

- `.github/workflows/copilot-autofix-handoff.yml` は Copilot Code Review の actionable finding を検出したときだけ、PR会話に自動修正依頼を中継します。
- `scripts/copilot-autofix-handoff.js` は同じ判定・状態遷移ロジックをローカルテストで検証するための純粋関数群です。
- `test/copilot-autofix-handoff.test.js` は権限境界、重複防止、PR単位の3回上限、偽marker、stop後の再実行抑止を確認します。
