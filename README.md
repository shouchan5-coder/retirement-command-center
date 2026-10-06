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
- **Exit Route Planner**: 配偶者扶養 / 国保＋国民年金 / 任意継続＋国民年金 / 自社法人を比較し、選択ルートの制度コストを必要資本へ任意反映
- **Own-company remuneration screen**: 役員報酬0 / 6 / 10 / 20 / 30万円/月を、2026年の協会けんぽ東京・厚生年金標準報酬表で概算比較
- **Individual Tax Engine**: 2026年給与所得控除・基礎控除・所得税速算表を使い、役員報酬0円時との差分税額を計算。住民税は東京23区・扶養なしを基準にした簡易モデル
- **Exit Year × Route Optimization**: 2027年以降 × 扶養 / 国保 / 任意継続 / 法人0・6・10・20・30万円を横断比較し、READY内の必要資本最小ルートを抽出
- **Lifetime FIRE Runway**: 妻就業終了・公的年金・制度年齢上限・75歳以降医療費を含め、Plan End Ageまでの資産枯渇を年次シミュレーション
- **Corporate external cash**: 法人の税引後・役員報酬前の外部純CFを入力し、社保・限界税・法人固定費から控除してグループ純負担を評価

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
8. System DD + Lifetime — 5pt / Critical

GOは原則として `Score >= 85`、`Data Quality >= 80`、全Critical Gate PASSが必要です。v5ではSystem DD + LifetimeもCriticalとし、退職後制度ルートが未反映、または選択Exit年からPlan End Ageまで資産が枯渇する場合は最終GOにしません。

## Exit Timing Matrix

年次比較は最終FIRE判定ではありません。各年末時点について以下を比較します。

- Baseリターン前提の金融資産予測
- 当該年に発現済みのRE CF
- 本人退職：配偶者収入＋RE CFを控除した不足額
- セミリタイア：上記に「本人ネット収入（税・社保後）」を追加
- 夫婦完全FIRE：給与収入をゼロとしてRE CFのみ控除
- SWR、退職移行バッファ、Capital Margin Policyを反映した必要資本

RE CFが未入力の物件を含む年は `*` を付け、Capital Screenを確定判定として扱いません。

## Exit Year × Route Optimization

各Exit年について、本人退職（配偶者就業継続）を前提に以下を同時比較します。

- 配偶者扶養
- 国保＋国民年金
- 任意継続＋国民年金
- 自社法人：役員報酬 0 / 6 / 10 / 20 / 30万円/月

各セルでは Base金融資産、制度ルート年間コスト、必要資本、Capital Margin を計算します。

- READYが存在する年: READY内で必要資本最小のルートをBEST
- READYが存在しない年: 入力可能ルート中で必要資本最小を参考BEST
- 法人ルート: 役員報酬はグループ内資金移動として外部流出に含めず、社保＋限界税＋法人固定費−法人外部純CFを制度コストとして扱う

制度コストは2026年ルールまたは入力値を将来年へ据え置くCapital Screenであり、将来法令を予測するものではありません。

## Lifetime FIRE Runway

Exit年末時点のBase金融資産から退職Transitionを一度控除した後、毎年次の順に更新します。

`前年末金融資産 × (1 + 退職後名目リターン) - [コア生活費 + 制度コスト - 配偶者収入 - RE CF - 税後年金]`

明示入力必須:

- 本人の生年
- Plan End Age
- 妻の就業最終年
- 本人 / 妻の年金開始年
- 本人 / 妻の税後年金年額
- 75歳以降の医療保険料
- 退職後名目運用利回り
- 任意継続 / 扶養終了後のFallbackルート

年齢調整:

- 国民年金第1号・第3号: 原則60歳未満まで
- 任意継続: 原則2年間、その後Fallbackへ
- 法人の厚生年金: 原則70歳未満
- 健康保険: 原則75歳未満
- 75歳以降: 入力した後期高齢者医療保険料へ切替

最終GOでは、選択したExit年・制度ルートのLifetime Runwayが `SURVIVES` であることをCritical条件に含めます。夫婦完全FIREでは配偶者の就業収入を0として計算し、配偶者扶養ルートはINVALIDとします。

## Exit Route / Tax & Social Insurance Planner

退職後の生活費とは別に、制度上発生する外部流出を管理します。

- 配偶者の健康保険扶養＋国民年金第3号候補
- 国民健康保険＋国民年金
- 健康保険任意継続＋国民年金
- 自社法人＋役員報酬 0 / 6 / 10 / 20 / 30万円/月

2026年10月6日時点の公式情報を参照値として使用します。

- 国民年金保険料: 17,920円/月（2026年度）
- 協会けんぽ東京: 健康保険 9.85%
- 介護保険: 1.62%（40–64歳）
- 子ども・子育て支援金: 0.23%
- 厚生年金: 18.3%
- 子ども・子育て拠出金: 0.36%（事業主負担）
- 任意継続の標準報酬月額上限: 32万円（協会けんぽ2026年度）

国保は市区町村で算定方法が異なるため、アプリでは正式試算・通知額を入力します。配偶者扶養は130万円未満等の収入基準を数値スクリーニングしますが、最終認定は加入保険者で確認します。2030年等の将来判定では、上記2026年値をそのまま制度確定値として扱わず、退職前年に再DDしてください。

「選択ルートの年間制度コストをFIREモデルへ反映」をONにすると、本人退職 / 完全FIREの年間生活コストへ加算します。セミリタイア列は「本人ネット収入（税・社保後）」入力を使うため、同じ社会保険費は二重加算しません。

### Corporate remuneration screen caveats

法人ルートはFIRE判断用の一次スクリーニングです。標準報酬月額を2026年東京支部の保険料額表から求め、本人負担・会社負担・個人税・会社固定費を比較します。個人税は実効税率入力ではなく、給与所得控除・基礎控除・社会保険料控除・所得税速算表から計算します。

- 役員報酬0円時の本人の社会保険資格は自動判定しません
- 法人税の損金効果、他の所得との通算、住民税、各種所得控除は精密計算しません
- 実効税率0%は「税を無視」の意味であり、無税を意味しません

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
