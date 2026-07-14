import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  callAI,
  createUnlockToken,
  extractJson,
  passwordMatches,
  requireUnlockToken,
  verifyUnlockToken,
} from "./gate.server";

const TokenInput = z.object({ token: z.string().optional().nullable() });

export const checkUnlocked = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => TokenInput.parse(data))
  .handler(async ({ data }) => ({ unlocked: verifyUnlockToken(data.token) }));

export const unlockSite = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ password: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const expected = process.env.SITE_PASSWORD;
    if (!expected) throw new Error("SITE_PASSWORD is not set");
    if (!passwordMatches(data.password, expected)) {
      return { ok: false as const };
    }
    return { ok: true as const, token: createUnlockToken() };
  });

export const lockSite = createServerFn({ method: "POST" }).handler(async () => {
  return { ok: true as const };
});

// --- AI generation ---

const ExploreInput = z.object({
  theme: z.string().trim().min(1).max(120),
  token: z.string().min(1),
});

export const exploreTheme = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ExploreInput.parse(d))
  .handler(async ({ data }) => {
    requireUnlockToken(data.token);
    const system = `あなたは博識な人文・科学のリサーチャー兼、厳格な用語検証者です。日本語で回答し、必ず有効なJSONのみを返してください。装飾やコードブロックは禁止。実在確認に少しでも迷う専門用語・概念は採用せず、辞典・学術書・論文・公的資料で定着している正式名称だけを使ってください。`;
    const prompt = `テーマ「${data.theme}」について次を生成:
1) "terms": 関連する専門用語・概念を必ず10件。各項目 { "name": 用語(正式名称), "field": 学問分野, "desc": 60〜90字の簡潔な解説 }。
   厳守事項:
   - **実在し、学術書・辞典・論文・公的資料などで確認できる定着済みの用語・概念のみ**を出力する。造語、想像上の用語、記憶が曖昧な名称、翻訳が不自然な名称、それらしい響きだけで作った用語、単なる一般語の組み合わせは絶対に出力しない。少しでも実在が疑わしいものは別の確実な用語に置き換える。
   - 用語名は正式名称（日本語の定訳がある場合は日本語、必要に応じて括弧で原語併記）。俗称、比喩表現、AIが説明のために作ったラベル、複数語を勝手につないだ疑似用語は不可。
   - 各用語について、出力前に「この名称でそのまま検索して学術・辞典・公的な説明に到達できるか」を内部確認する。到達できる確信がない候補は削除し、より基本的でも確実に実在する用語へ置き換える。
   - **テーマとの関連性は必須**。テーマから検索・連想の線が実際に辿れる用語のみ採用する（無関係な分野の用語を無理に混ぜない）。同じ分野からの採用は自由で、同一分野で幅広く（下位区分・関連下位理論・派生概念・対立概念など）拾ってよい。分野の均等分配より **意外性と関連性の両立** を優先する。
   - **意外性を最重視**。誰もがまず思いつく代表的用語（例: 心理学テーマで「認知的不協和」だけ、記号論テーマで「シニフィアン／シニフィエ」だけ）で埋めず、同じ分野内でも一般には知られにくいがテーマと確実に関わる下位概念・周辺理論・専門用語を積極的に混ぜる。10件のうち少なくとも半数は、そのテーマを検索した人が「この用語は知らなかったが確かに関係がある」と感じる水準の意外性を持たせる。
   - 分野は問わない。心理学・記号論・哲学のみに偏るのは避け、テーマから自然に関係が伸びる範囲で他分野（自然科学・工学・経済学・言語学・歴史学・民俗学・芸術・スポーツ科学・食文化など）にも入ってよいが、無関係な分野を件数合わせのために入れるのは禁止。
2) "usages": このテーマの「使い道」の題材案を必ず10件。各項目 { "title": 20字以内の題材名, "desc": 60〜100字の具体的内容 }。
   厳守方針:
   - **1で挙げた専門用語・概念のいくつかに具体的に紐づく題材にする**（用語名を desc の中で自然に言及してよい）。
   - **同じテーマでも切り口・目的・立場・出力形式・想定利用シーンを大きく変える**。似た内容の題材を並べるのは禁止。表層的な「○○について書く／振り返る」系ばかりにしない。
   - **意外性と幅広さを最重要視**する。日常でふと役立つ実用系から、読み物として面白いもの、仕事・専門実務で武器になるもの、思考の枠を広げる知的挑戦系まで、**目的の幅を大きくばらけさせる**こと。「学習系」「創作系」ばかりに偏るのは禁止。
   - 以下の目的レイヤーから **最低6レイヤー以上をまたいで** 構成する（各レイヤーの例はあくまで参考。テーマから自然に伸びる範囲で自由に発想してよい）:
     * 日常生活・実用アドバイス系（買い物選定、片付け、料理献立、旅の計画、雨の日の過ごし方、部屋づくり、贈り物選び、家事の効率化、天気や季節との付き合い方 など）
     * 読み物・エンタメ系（短い物語、エッセイ、寓話、ミニ神話、ショートショート、架空のインタビュー記事、雑誌コラム風、ノンフィクション風ルポ など）
     * 学習・教育系（中学生向け解説、比喩による説明、クイズ、学習ロードマップ、誤概念の矯正、対話形式の授業 など）
     * 創作・アイデア系（小説設定、詩・俳句・短歌、脚本、キャラクター造形、世界観設計、ゲームシナリオ、広告コピー案 など）
     * 仕事・ビジネス系（企画書骨子、営業トークスクリプト、会議アジェンダ、顧客ペルソナ、市場分析枠組み、業務改善提案、レビュー観点リスト、面接質問設計 など）
     * 思考拡張・知的挑戦系（思考実験、前提を疑う質問生成、逆説的立論、複数分野からのアナロジー生成、未来シナリオ分岐、常識の再定義 など）
     * 意思決定・分析系（複数案比較、SWOT/PEST、根拠の可視化、リスク洗い出し、意思決定ジャーナル、選択肢のリフレーミング など）
     * 対話・ロールプレイ系（専門家・歴史人物・架空キャラとの対話、ソクラテス式問答、悪魔の代弁者、多視点会議シミュレーション など）
     * 変換・翻案系（専門文献の平易リライト、別分野へのアナロジー変換、古典の現代語訳、箇条書き→物語、詩→散文、専門用語→比喩 など）
     * 内省・自己対話系（思考の癖の指摘、価値観の棚卸し、理想の自己への手紙、感情ログの分析、習慣の意味づけ など）
     * 文化・歴史・民俗系（世界各地の伝承比較、時代別受容史、地域差の分析、儀礼・慣習の意味読み解き など）
     * 健康・ライフスタイル系（習慣化プラン、睡眠・食事改善、運動導入、人間関係の対話改善、メンタルケア など）
   - **意外性を最重視**。表面的な用途（例: 星で「星座を解説」だけ、ジャーナリングで「今日を振り返る」だけ）は禁止。「そのテーマからこの使い方が出るとは思わなかった」と感じさせる切り口を必ず半数以上入れる。
   - 各題材の目的・出力形式・想定利用者を desc 内で具体化する。
   - すべて **AIに文章（テキスト）を出力させる** 題材にする（画像・音声・コード生成は不可）。

出力は次の形の純粋なJSONのみ:
{"terms":[...10件...],"usages":[...10件...]}`;
    const raw = await callAI(prompt, system);
    const parsed = extractJson<{
      terms: Array<{ name: string; field: string; desc: string }>;
      usages: Array<{ title: string; desc: string }>;
    }>(raw);
    const verificationPrompt = `次のJSONを監査し、テーマ「${data.theme}」に対して、実在しない専門用語・概念、正式名称として不自然な用語、単なる造語や一般語の組み合わせを必ず排除してください。

監査方針:
- "terms" は必ず10件にする。
- 各 "name" は、学術書・専門辞典・査読論文・大学教材・公的資料などでその名称のまま確認できる定着済みの専門用語・概念だけにする。
- **実在性が確認できる限り、意外性・多様性は最大限維持する**。実在する専門用語であれば、一般に有名でない下位概念・周辺理論・専門用語も積極的に残す。「聞き慣れない」だけを理由に有名で無難な用語へ置き換えるのは禁止。実在が疑わしいもの（造語、AIが作った複合語、不自然な翻訳、確認困難な流派名など）だけを、テーマに関連する別の確実な実在用語（できるだけ意外性のあるもの）に置き換える。
- 置き換え後も10件全体で分野・抽象度・知名度が偏らないようにする。全員が真っ先に思いつく代表用語ばかりで埋めない。
- "field" は実際にその用語が使われる分野名にする。
- "desc" は60〜90字で、用語の実際の意味とテーマとの関連を説明する。
- "usages" は10件のまま保ち、切り口・カテゴリの多様性を維持したうえで、置き換え後の terms と矛盾する内容があれば自然に修正する。似た題材が並ばないようにする。


入力JSON:
${JSON.stringify(parsed)}

出力は同じ形の純粋なJSONのみ:
{"terms":[...10件...],"usages":[...10件...]}`;
    const verifiedRaw = await callAI(verificationPrompt, system);
    return extractJson<{
      terms: Array<{ name: string; field: string; desc: string }>;
      usages: Array<{ title: string; desc: string }>;
    }>(verifiedRaw);
  });


const PromptInput = z.object({
  theme: z.string().trim().min(1).max(120),
  usageTitle: z.string().trim().min(1).max(120),
  usageDesc: z.string().trim().min(1).max(400),
  token: z.string().min(1),
});

export const generatePrompt = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PromptInput.parse(d))
  .handler(async ({ data }) => {
    requireUnlockToken(data.token);
    const system = `あなたはプロンプト設計の名匠です。日本語で回答し、必ず有効なJSONのみを返してください。装飾やコードブロックは禁止。生成するプロンプトは「文章を出力させるためのプロンプト」であり、画像・音声等ではありません。**重要**: JSONの "prompt" フィールド（＝生成する完成プロンプト本文）は **プレーンな日本語テキストのみ** で書くこと。Markdown記法（#, ##, *, **, -, 番号付きリスト記号 等）、コードブロック、表、装飾記号は一切使わない。段落や項目の区切りは通常の改行と自然な日本語（「まず」「次に」「最後に」「以下の点に注意してください」等）で表現する。また "prompt" 本文に「以下のJSON形式で出力してください」等のJSON出力指示や、"{...}" のようなJSONスキーマ例を絶対に書かないこと。`;
    const prompt = `テーマ「${data.theme}」で、作業「${data.usageTitle}: ${data.usageDesc}」を実行させる高品質なプロンプトを設計してください。

必須条件:
- プロンプトは、AIに **文章（テキスト）を出力させる** ためのものであること。
- 完成プロンプト本文（"prompt"）は **Markdownを一切使わないプレーンテキスト** で書くこと。見出し記号(#)、箇条書き記号(-,*,•)、太字(**)、番号付きリスト、コードブロック、表は禁止。自然な日本語の段落と通常の改行のみで手順・出力形式を明示する。
- プロンプト設計の骨格として、以下の3種類の要素を **必ずそれぞれ最低1つずつ** 組み合わせて活用すること。**題材に応じて各カテゴリから複数採用してよい**（例: 学術理論3＋思考法2＋プロンプト技法2 のように偏らせても可。合計3〜7個程度）。**多様性は最重要**: 毎回同じ定番の組み合わせ（例: 認知的不協和＋批判的思考＋Chain-of-Thought）にせず、題材ごとに違う理論・思考法・技法を選ぶこと。実在する範囲で、一般には知名度が低いが題材に確実に効く要素を積極的に混ぜる。
  (A) 学術理論 — **実在し学術書・論文・専門辞典で確認できる具体的理論名のみ**。心理学・哲学の定番だけに偏らせず、テーマから連想が伸びる範囲で自然科学・工学・経済学・社会学・言語学・人類学・情報科学・生物学・美学・スポーツ科学・栄養学・歴史学など幅広い分野から選ぶ。参考例（これに限らない）: 認知的不協和理論、自己決定理論、社会的学習理論、期待効用理論、プロスペクト理論、限定合理性、ナッジ理論、状況的学習論、活動理論、フロー理論、自己効力感、アタッチメント理論、生成文法、関連性理論、発話行為論、フレーム意味論、記号論、構造主義、現象学、批判理論、アクターネットワーク理論、複雑系理論、情報理論、制御理論、ゲーム理論、進化的安定戦略、系統発生学、恒常性、アロスタシス、熱力学第二法則、エントロピー、確率過程論、ベイズ推論、統計的学習理論、圏論、グラフ理論 など。名称単体で検索・確認できる確信がない候補は別の確実な理論に置き換える。造語・不自然な翻訳・曖昧な名称は禁止。
  (B) 思考法 — 実在するもののみ。参考例（これに限らない）: アナロジー思考、システム思考、TRIZ、ラテラルシンキング、批判的思考、逆算思考、MECE、演繹・帰納・アブダクション、デザイン思考、仮説思考、シナリオプランニング、5Why、KJ法、ロジックツリー、ピラミッドストラクチャ、ゼロベース思考、両利きの思考、弁証法、思考実験、フェルミ推定、逆問題思考、ステークホルダー分析 など。毎回同じ2〜3個に偏らせない。造語禁止。
  (C) プロンプトエンジニアリング技法 — **論文・公式ドキュメントで名称が確認できる技法のみ**。**特定の技法（特にChain-of-Thought, Few-shot, ReAct 等の定番）に偏らせず、題材ごとに毎回違う技法を選び直す**こと。参考例（これに限らず、実在する技法なら自由に選出可）: Chain-of-Thought, Few-shot, Zero-shot-CoT, Self-Consistency, ReAct, Tree-of-Thoughts, Graph-of-Thoughts, Step-Back Prompting, Least-to-Most, Plan-and-Solve, Decomposed Prompting, Multi-Persona / Persona Switch, Self-Refine, Reflexion, Skeleton-of-Thought, Chain-of-Verification (CoVe), Chain-of-Density, Chain-of-Note, Program-of-Thought, Program-Aided Language (PAL), Analogical Prompting, Emotion Prompt, Rephrase-and-Respond, Contrastive CoT, Self-Ask, Maieutic Prompting, Generated Knowledge Prompting, Directional Stimulus Prompting, Active-Prompt, Automatic Prompt Engineer (APE), Automatic CoT (Auto-CoT), Buffer of Thoughts, Meta Prompting, Thread of Thought, Chain-of-Symbol, System 2 Attention (S2A), Progressive-Hint Prompting, ExpertPrompting, Role Prompting, Take a Deep Breath, Recitation-Augmented, Ask-Me-Anything Prompting, DecomP, Faithful CoT, Selection-Inference, Iterative Refinement, Constitutional AI style critique, Debate Prompting, Chain-of-Density, MedPrompt など。造語、確認困難な略称、論文名だけを技法名のように扱うことは禁止。
- **重要（骨格の実埋め込み）**: "components" に挙げた各要素の **名称そのものを "prompt" 本文中に必ず明示的に登場させ**、その要素がどう手順に効くかを1〜2文で織り込むこと（例: 「まずプロスペクト理論の枠組みで損失回避の観点から選択肢を評価し…」「次に Step-Back Prompting の要領で一段抽象化した問いを立て…」）。単に理論名を羅列するのではなく、**その要素の考え方・手順・チェック観点をプロンプトの指示ステップの中に具体的に組み込む**こと。名前だけ出して機能していない状態は禁止。
- 完成プロンプトは、前提設定→思考手順（各要素を組み込み）→出力形式指定→自己チェック観点、の流れを自然な段落で明示する。出力形式は文字数・構成・トーンなどを具体的に指定する。
- **最終自己チェック**: "prompt" 本文を書き終えた後、"components" に挙げた要素名がすべて本文中に登場し、かつそれぞれが単なる言及ではなく手順として機能しているかを内部で確認し、満たしていなければ書き直してから出力すること。


出力は純粋なJSONのみ:
{
  "thinking_process": "この作業を遂行するための思考プロセスを2〜4文で説明",
  "components": [
    { "name": "具体名", "category": "学術理論", "reason": "採用理由（60〜100字）" },
    { "name": "具体名", "category": "思考法", "reason": "採用理由（60〜100字）" },
    { "name": "具体名", "category": "プロンプトエンジニアリング", "reason": "採用理由（60〜100字）" }
  ],
  "prompt": "完成した文章生成用プロンプト本文。Markdown記法は一切使わずプレーンテキストのみ。段落は通常の改行で区切る。日本語。600〜1200字程度。componentsに挙げた要素名を必ず本文中に明示的に登場させ、手順として機能させること。"
}`;
    const raw = await callAI(prompt, system);
    const parsed = extractJson<{
      thinking_process: string;
      components: Array<{ name: string; category: string; reason: string }>;
      prompt: string;
    }>(raw);
    return parsed;
  });

const RefineInput = z.object({
  theme: z.string().trim().min(1).max(120),
  usageTitle: z.string().trim().min(1).max(120),
  usageDesc: z.string().trim().min(1).max(400),
  currentPrompt: z.string().trim().min(1).max(20000),
  instruction: z.string().trim().max(400).optional(),
  token: z.string().min(1),
});

export const improvePrompt = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RefineInput.parse(d))
  .handler(async ({ data }) => {
    requireUnlockToken(data.token);
    const system = `あなたはプロンプト設計の名匠です。日本語で回答し、必ず有効なJSONのみを返してください。装飾やコードブロックは禁止。**重要**: JSONの "prompt" フィールド本文は **Markdown記法を一切使わないプレーンな日本語テキスト** のみ。見出し記号(#)、箇条書き記号(-,*,•)、太字(**)、番号付きリスト、コードブロック、表は禁止。段落は通常の改行と自然な日本語で区切る。「以下のJSON形式で出力してください」等のJSON出力指示やJSONスキーマ例も絶対に含めない。`;
    const prompt = `以下は既存のプロンプトです。テーマ「${data.theme}」、題材「${data.usageTitle}: ${data.usageDesc}」向け。
これを **より高品質に改善** してください。改善観点:
- 曖昧さの排除、指示の明確化、出力形式の厳密化
- 学術理論／思考法／プロンプトエンジニアリング技法（**すべて実在し論文・学術書・専門辞典・公式資料で確認できる名称に限る。造語、不確かな名称、不自然な翻訳、単なる一般語の組み合わせは禁止**）の骨格を強化
- 前提条件・制約・評価基準・例示の追加
- 冗長な箇所は簡潔化
- **出力プロンプト本文はプレーンテキストのみ**。Markdown記法（見出し#、箇条書き-*、太字**、コードブロック等）は使わず、自然な日本語の段落と改行で表現する。

${data.instruction ? `追加の指示: ${data.instruction}\n\n` : ""}既存プロンプト:\n"""\n${data.currentPrompt}\n"""

出力は純粋なJSONのみ:
{
  "changes": "主な改善点を3〜5個の箇条書きで（各30〜60字）。改行\\nで区切る",
  "prompt": "改善後の完成プロンプト本文（Markdown禁止・プレーンテキスト・日本語）"
}`;
    const raw = await callAI(prompt, system);
    return extractJson<{ changes: string; prompt: string }>(raw);
  });

export const continuePrompt = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RefineInput.parse(d))
  .handler(async ({ data }) => {
    requireUnlockToken(data.token);
    const system = `あなたはプロンプト設計の名匠です。日本語で回答し、必ず有効なJSONのみを返してください。装飾やコードブロックは禁止。**重要**: 各案の "continuation" 本文は **Markdown記法を一切使わないプレーンな日本語テキスト** のみ。見出し記号(#)、箇条書き記号(-,*,•)、太字(**)、番号付きリスト、コードブロック、表は禁止。段落は通常の改行と自然な日本語で区切る。「以下のJSON形式で出力してください」等のJSON出力指示やJSONスキーマ例も絶対に含めない。`;
    const prompt = `以下は既存のプロンプトです。テーマ「${data.theme}」、題材「${data.usageTitle}: ${data.usageDesc}」向け。
このプロンプトの **続き（追記部分）を必ず3案** 生成してください。既存部分と重複させず、それぞれ以下を厳守:
- 3案すべてで **学術理論／思考法／プロンプトエンジニアリング技法をそれぞれ違うもの** を採用する（案間で重複禁止）。
- **学術理論・思考法は実在し学術書・論文・専門辞典で確認できるもののみ**。造語、曖昧な名称、それらしく作った用語、不自然な翻訳、単なる一般語の組み合わせは禁止。名称単体で検索・確認できる確信がない場合は採用しない。テーマから距離のある分野（自然科学・工学・経済学・言語学など）からも積極的に採用する。
- プロンプトエンジニアリング技法は **論文・公式ドキュメントで名称が確認できる技法なら何でも良く、特定の技法に偏らせない**。参考例（これに限らず自由に選出可）: Chain-of-Thought, Self-Consistency, ReAct, Tree-of-Thoughts, Graph-of-Thoughts, Step-Back, Least-to-Most, Plan-and-Solve, Decomposed Prompting, Multi-Persona/Persona Switch, Self-Refine, Reflexion, Skeleton-of-Thought, Chain-of-Verification, Chain-of-Density, Chain-of-Note, Program-of-Thought, PAL, Analogical Prompting, Emotion Prompt, Rephrase-and-Respond, Contrastive CoT, Self-Ask, Maieutic Prompting, Generated Knowledge Prompting, Directional Stimulus Prompting, Active-Prompt, APE, Auto-CoT, Buffer of Thoughts, Meta Prompting, Thread of Thought, Chain-of-Symbol, System 2 Attention, Progressive-Hint Prompting など。造語、確認困難な略称、論文名だけを技法名扱いすることは禁止。**3案間で技法を重複させず、案ごとに毎回違う技法を選ぶ**こと。
- 3案は方向性を変える（例: 案1=手順詳細化+Few-shot、案2=自己検証・評価、案3=ペルソナ切替や別視点導入 など）。
- 各案は既存プロンプトの末尾に追記する形の本文のみ。既存内容を繰り返さない。
- **追記本文はプレーンテキストのみ**。Markdown記法は使わず、自然な日本語の段落と改行で表現する。

${data.instruction ? `追加の方向性: ${data.instruction}\n\n` : ""}既存プロンプト:\n"""\n${data.currentPrompt}\n"""

出力は純粋なJSONのみ:
{
  "items": [
    {
      "continuation": "追記本文（Markdown禁止・プレーンテキスト・日本語・300〜700字程度）",
      "components": [
        { "name": "採用した学術理論の具体名", "category": "学術理論", "reason": "採用理由（40〜80字）" },
        { "name": "採用した思考法の具体名", "category": "思考法", "reason": "採用理由（40〜80字）" },
        { "name": "採用したプロンプト技法の具体名", "category": "プロンプトエンジニアリング", "reason": "採用理由（40〜80字）" }
      ]
    },
    { "continuation": "...", "components": [ ... ] },
    { "continuation": "...", "components": [ ... ] }
  ]
}`;
    const raw = await callAI(prompt, system);
    return extractJson<{
      items: Array<{
        continuation: string;
        components: Array<{ name: string; category: string; reason: string }>;
      }>;
    }>(raw);
  });


