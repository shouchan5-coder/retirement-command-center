# 2030 Retirement Command Center v5

2030年前後の本人退職 / セミリタイア / 夫婦完全FIREを、資産額だけでなく支出証拠・流動性・不動産CF・Stress耐性・擬似退職・制度DDまで含めて判定する個人用Webアプリです。

## Production

GitHub Pages: `https://shouchan5-coder.github.io/retirement-command-center/`

## v5 additions

- **Exit Timing Matrix**: 2027年以降の複数年を並べ、本人退職 / セミリタイア＋本人ネット収入 / 夫婦完全FIREの必要資本とBase金融資産を比較
- **Capital Screen separation**: 年次比較のREADYは資本面だけの一次判定。最終GO/NO-GOは8 Decision GatesとData Qualityで別判定
- **Year-aware RE CF**: 物件ごとにFuture CF発現年を設定し、将来CFをそれ以前の年へ前倒ししない
- **Privacy hardening**: 公開コードの初期値から個人名・物件名・個人金融額を除去。既存の保存データはSupabase / localStorageから移行
- **v5 state migration**: v1–v4の保存状態をv5へ互換移行

## Core modules

- **Input Precision**: 12か月の正常化コア生活費、資産as-of、積立実績、制度DD、連結BSのData Quality管理
- **Quarterly History**: 金融資産・指定安全資産・2030 RE CF・Readiness Scoreの時系列SVGチャート
- **Real Estate CF Ledger**: 物件別に賃料、返済、管理費、固定資産税/保険、修繕引当、空室引当、その他経費を管理。Override、Future CF発現年、Confidenceを併用
- **Pseudo-Retirement Lab**: 本人給与=0として、配偶者収入・RE CF・安全資産・市場Shock・修繕・移行費を組み合わせて強制売却の有無を判定
- **GO/NO-GO**: 8つのDecision Gates、Data Quality、Critical Gate、Capital MarginでGO / CONDITIONAL / BUILD / INPUT REQUIREDを判定
- **Inflation-aware model**: 現在生活費をExit年までインフレ補正し、配偶者収入成長率とRE CFを同じ年ベースで比較
- **Projection**: Conservative / Base / Upsideの月次複利＋月次積立モデル

## Decision Gates

1. Spending Evidence — 15pt / Critical
2. Capital Adequacy — 20pt / Critical
3. Recurring CF — 10pt
4. Liquidity Buffer — 15pt / Critical
5. Composite Stress — 15pt / Critical
6. RE Data Quality — 10pt
7. Pseudo Retirement — 10pt
8. System DD — 5pt

GOは原則として `Score >= 85`、`Data Quality >= 80`、全Critical Gate PASSが必要です。

## Exit Timing Matrix

年次比較は最終FIRE判定ではありません。各年末時点について以下を比較します。

- Baseリターン前提の金融資産予測
- 当該年に発現済みのRE CF
- 本人退職：配偶者収入＋RE CFを控除した不足額
- セミリタイア：上記に「本人ネット収入（税・社保後）」を追加
- 夫婦完全FIRE：給与収入をゼロとしてRE CFのみ控除
- SWR、退職移行バッファ、Capital Margin Policyを反映した必要資本

RE CFが未入力の物件を含む年は `*` を付け、Capital Screenを確定判定として扱いません。

## Cloud data

個人の金融データ・物件名はGitHub repositoryへ保存しません。入力値はSupabase Authのログインユーザー `user_metadata` に保存します。

- current state: `retirement_state`
- quarterly history: `hist`
- v5 state schema: `version: 5`
- history: 最大20四半期
- local cache: `retirementLocalV5`（v4以前をfallback読込）

## Security / privacy

`config.js` にはブラウザ公開用のSupabase Project URL / Publishable keyのみを置きます。`secret` / `service_role` keyはフロントエンドへ置かないでください。

v5は現在のソースから個人名・物件名・個人金融額を除去します。ただし、過去コミットに含まれていた情報はGit履歴から自動では消えません。履歴からも除去する場合は、別途history rewriteまたはrepository visibilityの見直しが必要です。
