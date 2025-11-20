# Obsidian Focus Mode Plugin

iA Writerのような「没入型執筆体験」をObsidian内で再現することを目指したプラグインです。
執筆に集中するための視覚効果と、ワークスペースの自動制御機能を提供します。

## 主な機能

### 1. 視覚的フォーカス (Visual Effects)
設定で以下のいずれかを選択できます（排他選択）：
- **パラグラフフォーカス (Paragraph Focus)**:
  現在カーソルがある段落（空行で区切られたブロック）以外を薄く表示します。
- **センテンスフォーカス (Sentence Focus)**:
  現在の「文」以外を薄く表示します。より深い集中が必要な場合に有効です。
- **アクティブ行フォーカス (Active Line Focus)**:
  現在の行以外を薄く表示します。1行単位での集中に最適です。
- **なし (None)**:
  視覚効果を使用しません。

全ての視覚的フォーカスモードでは、inline-titleも自動的に非表示になります。

### 2. その他の機能
- **フロントマター非表示**:
  フォーカスモード中は、YAMLフロントマターを自動的に隠し、本文だけに集中できるようにします。
- **タイプライターモード (Typewriter Scroll)**:
  カーソル位置が常に画面の指定位置に来るように、スムーズなアニメーション付きでスクロール位置を自動調整します。
  文書の最初の行でも中央に配置できるよう、エディター上下に十分な余白が追加されます。
- **柔軟なオフセット (Flexible Offset)**:
  タイプライターモード時のカーソル位置を、画面上部からの割合（0%=上端、50%=中央、100%=下端）で自由に設定可能です。
- **UI制御 (Zen UI)**:
  サイドバー自動格納、リボン・ステータスバー・タブヘッダーの非表示。

### 3. トリガー条件 (Triggers)
- **フォルダ連動 (Context-Aware)**:
  設定したフォルダ（例: `Journal/`, `Drafts/`）内のファイルを開くと、自動的にフォーカスモードが起動します。
- **手動切り替え (Manual Toggle)**:
  コマンドパレットから `Toggle Focus Mode` を実行することで、いつでもモードを切り替えられます。

## インストール方法（開発ビルド）

### 1. プラグインのビルド
ターミナルでプロジェクトのルートディレクトリを開き、以下のコマンドを実行します。

```bash
npm install
# .envファイルを作成し、OBSIDIAN_PLUGIN_PATHを設定すると自動コピーされます
npm run build
```

### 2. 自動コピーの設定 (オプション)
プロジェクトルートに `.env` ファイルを作成し、Obsidianのプラグインフォルダパスを設定すると、ビルド時に自動的にファイルがコピーされます。

```env
OBSIDIAN_PLUGIN_PATH=/Users/username/Documents/Obsidian Vault/.obsidian/plugins/obsidian-focus-mode
```

### 3. 手動インストール
`.env` を使用しない場合は、以下のファイルを `.obsidian/plugins/obsidian-focus-mode/` にコピーしてください。
- `main.js`
- `styles.css`
- `manifest.json`

## 使い方

1. **設定**:
   - **設定 > Focus Mode** を開きます。
   - 「Focus Folder Paths」に、フォーカスモードを有効にしたいフォルダのパスを入力します。
   - 「Focus Style」で、好みの視覚効果（Paragraph, Sentence, Active Line）を選択します。
   - その他、タイプライタースクロールやフロントマター非表示の設定を行います。

2. **コマンド**:
   - `Focus Mode: Toggle Focus Mode`: フォーカスモード全体のON/OFF切り替え
   - `Focus Mode: Toggle Paragraph Focus`: パラグラフフォーカスの切り替え
   - `Focus Mode: Toggle Sentence Focus`: センテンスフォーカスの切り替え
   - `Focus Mode: Toggle Active Line Focus`: アクティブ行フォーカスの切り替え
   - `Focus Mode: Toggle Typewriter Scroll`: タイプライタースクロールの切り替え
   - `Focus Mode: Toggle Frontmatter Hiding`: フロントマター非表示の切り替え
   - `Focus Mode: Toggle Zen UI`: Zen UIの切り替え
