# Restaurant Order System

飲食店の現場運用を想定して作成した、注文・キッチン・会計・開店前チェックを統合した店舗向けシステムです。  
ゲスト注文（多言語）からスタッフ会計処理までをリアルタイムで連携します。

## Highlights

- テーブル単位の注文管理（セッション対応）
- キッチン進行ステータス連携
- 会計処理・日次締め対応
- 開店前セルフチェック（DB整合性 / WAL / 同期モード）
- 障害切り分けを意識したエラーコード設計と運用ログ

## 技術スタック

- Node.js / Express
- SQLite3
- Socket.IO
- Vanilla JavaScript
- Jest / Playwright

## 1分クイックスタート

```bash
npm install
npm start
```

起動後:

- ゲスト画面: `http://localhost:3001/index.html`
- スタッフ画面: `http://localhost:3001/admin.html`
- キッチン画面: `http://localhost:3001/kitchen.html`
- 会計画面: `http://localhost:3001/finance.html`
- セルフチェック: `http://localhost:3001/recovery.html`

## 環境変数

`.env.example` を参照してください。

## よく使うコマンド

- `npm test` - テスト実行
- `npm run check:db` - DB健全性チェック
- `npm run smoke:order` - 営業状態→メニュー→注文のスモークチェック

## ライセンス

MIT
