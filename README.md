# retirement-command-center
この版は Supabase の独自DBテーブルを使いません。
ログインユーザー自身の `user_metadata` に以下を保存します。

- 現在のダッシュボード設定
- 最大18四半期のコンパクト履歴

そのため SQL Editor / RLS設定は不要です。

## ユーザー側に必要な外部操作
1. GitHubで `retirement-command-center` という Public repository を1つ作る
2. Supabaseで Project を1つ作る
3. Supabaseの Project URL と Publishable key をChatGPTへ共有する
   - これはブラウザ公開前提の値
   - Secret key / service_role key は共有しない
4. ChatGPTがファイル投入後、GitHub Settings > Pages で Source を `GitHub Actions` にする
5. 初回ログイン時、Supabaseの確認メールが届けばリンクを1回開く

それ以外のコード編集・ファイル投入はChatGPT側で行う想定です。
