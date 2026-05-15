# menu - こんだてアプリ

スマホで使える週間献立管理アプリです。

## 機能

- 1週間の夕飯献立を自動生成（主食・副菜・お汁・子どものご飯）
- 夜勤の日は🌛カレンダーでマークすると丼ものに自動変更
- 各メニューをタップして手動変更可能（レパートリーから選択）
- 週間買い物リスト自動生成（チェック機能付き）
- クックパッドへのレシピ検索連携
- 新しいレパートリーの追加・管理
- ホーム画面に追加してアプリとして使用可能（PWA）

## Vercelへのデプロイ手順

### 1. GitHubにプッシュ

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/あなたのID/kondate-app.git
git push -u origin main
```

### 2. Vercelにデプロイ

1. [vercel.com](https://vercel.com) にアクセスしてGitHubでログイン
2. 「New Project」→ GitHubリポジトリを選択
3. そのまま「Deploy」をクリック
4. デプロイ完了！URLが発行されます

### 3. ローカルで動作確認

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開く

## スマホのホーム画面に追加する方法

### iPhone（Safari）
1. Safariでアプリのページを開く
2. 下部の共有ボタン（四角に矢印）をタップ
3. 「ホーム画面に追加」を選択
4. 「追加」をタップ

### Android（Chrome）
1. Chromeでアプリのページを開く
2. メニュー（︙）→「ホーム画面に追加」
