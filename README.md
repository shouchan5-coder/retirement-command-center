# 2030 Retirement Command Center v4

2030年の本人退職 / 夫婦完全FIREを、資産額だけでなく支出証拠・流動性・不動産CF・Stress耐性・擬似退職・制度DDまで含めて判定する個人用Webアプリです。

## Production

GitHub Pages: `https://shouchan5-coder.github.io/retirement-command-center/`

## v4 modules

- **Input Precision**: 12か月の正常化コア生活費、資産as-of、積立実績、制度DD、連結BSのData Quality管理
- **Quarterly History**: 金融資産・指定安全資産・2030 RE CF・Readiness Scoreの時系列SVGチャート
- **Real Estate CF Ledger**: 物件別に賃料、返済、管理費、固定資産税/保険、修繕引当、空室引当、その他経費を管理。OverrideとConfidenceを併用
- **Pseudo-Retirement Lab**: 本人給与=0として、妻収入・RE CF・安全資産・市場Shock・修繕・移行費を組み合わせて強制売却の有無を判定
- **2030 GO/NO-GO**: 8つのDecision Gates、Data Quality、Critical Gate、Capital MarginでGO / CONDITIONAL / BUILD / INPUT REQUIREDを判定
- **Inflation-aware model**: 現在生活費をExit年までインフレ補正し、妻収入成長率と2030 RE CFを同じ年ベースで比較
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

## Cloud data

金融データはGitHub repositoryには保存しません。Supabase Authのログインユーザー `user_metadata` に保存します。

- current state: `retirement_state`
- quarterly history: `hist`
- v4 state schema: `version: 4`
- history: 最大20四半期

旧v1–v3の `retirement_state` / `hist` はv4起動時に互換読み込みし、次回クラウド保存でv4形式へ移行します。

## Security

`config.js` にはブラウザ公開用のSupabase Project URL / Publishable keyのみを置きます。`secret` / `service_role` keyはフロントエンドへ置かないでください。
