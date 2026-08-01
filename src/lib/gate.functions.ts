import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAI, extractJson } from "./gate.server";

const Lang = z.enum(["ja", "en"]).default("ja");
type Lang = z.infer<typeof Lang>;

function langLine(lang: Lang) {
  return lang === "ja"
    ? "日本語で回答し、必ず有効なJSONのみを返してください。装飾やコードブロックは禁止。"
    : "Respond in English and return ONLY valid JSON. No decorations, no code fences.";
}

// --- Explore ---

const ExploreInput = z.object({
  theme: z.string().trim().min(1).max(200),
  lang: Lang,
});

export const exploreTheme = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ExploreInput.parse(d))
  .handler(async ({ data }) => {
    const { lang, theme } = data;
    const system =
      lang === "ja"
        ? `あなたは博識な人文・科学のリサーチャー兼、厳格な用語検証者です。${langLine("ja")} 実在確認に少しでも迷う専門用語・概念は採用せず、辞典・学術書・論文・公的資料で定着している正式名称だけを使ってください。`
        : `You are a broad-ranging humanities-and-science researcher AND a strict terminology verifier. ${langLine("en")} Do not use any term or concept you cannot verify exists — only established formal names attested in dictionaries, academic books, peer-reviewed papers, or official sources.`;

    const prompt =
      lang === "ja"
        ? `テーマ「${theme}」について次を生成:
1) "terms": 関連する専門用語・概念を必ず10件。各項目 { "name": 用語(正式名称), "field": 学問分野, "desc": 60〜90字の簡潔な解説 }。
   厳守事項:
   - **実在し、学術書・辞典・論文・公的資料で確認できる定着済みの用語のみ**を出力。造語、想像上の用語、記憶が曖昧な名称、それらしい響きだけで作った擬似用語は絶対禁止。
   - **テーマとの関連性は必須**。ただし直球の類語で埋めない。テーマの周辺・隣接・裏側・比喩・応用先など「意外な角度」から拾う。
   - **分野の分散を最重要視**。10件を最低6つ以上の異なる学問分野にまたがらせる（例: 心理学・言語学・数学・生物学・経済学・工学・哲学・社会学・情報科学・美学・音楽学・建築・料理科学・気象学・法学・神経科学・民俗学・スポーツ科学 など、テーマから自然に伸びる範囲で幅広く）。同一分野の連発は3件までに制限。
   - **意外性の水準**: 10件のうち **少なくとも6件は「教科書の目次には載らないが確かに関係がある」中〜上級の用語**。誰もが真っ先に想起する超定番語は多くて3件まで。
   - **時代と地域も分散**: 現代の学術用語だけでなく、古典・非欧米圏由来の概念も歓迎（実在するものに限る）。
2) "usages": このテーマの「使い道」の題材案を必ず10件。各項目 { "title": 20字以内の題材名, "desc": 60〜100字の具体的内容 }。
   厳守方針:
   - 1で挙げた用語のいくつかに具体的に紐づく題材にする（用語名を desc の中で自然に言及可）。
   - **目的の幅を極端に広げる**。次の12レイヤーから **最低8レイヤーをまたぐ** こと。同一レイヤーは最大2件まで。
     ① 日常実用（家事・買い物・人付き合い等の具体判断）
     ② 読み物・エンタメ（短編小説、寓話、架空対談、書評風）
     ③ 学習・理解（初学者向け解説、比喩による説明）
     ④ 創作（詩、歌詞、シナリオ骨子、ネーミング）
     ⑤ 仕事・ビジネス（企画書、提案文、議事整理、交渉ロールプレイ）
     ⑥ 思考拡張（前提を疑う問い、反対仮説の生成、視点転換）
     ⑦ 意思決定支援（トレードオフ整理、リスク列挙、優先順位付け）
     ⑧ 対話・ロールプレイ（歴史人物との対話、専門家AIとの壁打ち）
     ⑨ 変換・翻案（別ジャンル化、比喩変換、子ども向け化）
     ⑩ 内省・セルフコーチング（問い出し、振り返り整理）
     ⑪ 文化・歴史・地理（起源探求、地域比較）
     ⑫ 健康・身体・ライフスタイル（習慣設計、感覚言語化）
   - **意外性を歓迎**: 「そのテーマでそんな使い方があるのか」と感じる斜めの題材を最低3件混ぜる。
   - 各題材は必ずAIに文章（テキスト）を出力させる題材にする。

出力は次の形の純粋なJSONのみ:
{"terms":[...10件...],"usages":[...10件...]}`
        : `For the theme "${theme}", generate:
1) "terms": exactly 10 related specialist terms/concepts. Each item { "name": formal name, "field": academic field, "desc": 1-2 sentence explanation (~60-140 chars) }.
   Rules:
   - Use ONLY terms that actually exist and can be verified in academic books, dictionaries, peer-reviewed papers, or official sources. NEVER invent coinages, fuzzy-remembered names, plausible-sounding pseudo-terms, or arbitrary compounds.
   - Terms must be genuinely related to the theme, but do NOT just list obvious synonyms. Pick from adjacent, underlying, metaphorical, or applied angles.
   - **Field diversity is the top priority.** The 10 terms must span at least 6 different academic fields (e.g. psychology, linguistics, mathematics, biology, economics, engineering, philosophy, sociology, information science, aesthetics, musicology, architecture, culinary science, meteorology, law, neuroscience, folklore studies, sports science — whatever the theme naturally reaches). Cap any single field at 3 items.
   - **Surprise floor**: at least 6 of the 10 must be mid-to-advanced terms that "wouldn't be in the table of contents of a beginner textbook, but truly connect". Cap ultra-obvious canonical terms at 3.
   - **Time / region diversity**: welcome classical and non-Western concepts too (only if genuinely real).
2) "usages": exactly 10 concrete "things you can do with this theme". Each item { "title": <= 40 chars, "desc": one specific paragraph (~80-160 chars) }.
   Rules:
   - Ground several usages in specific terms from (1); it's fine to name a term in the desc.
   - **Push the range of purposes to the extreme.** Span **at least 8** of these 12 layers, with at most 2 items per layer:
     (1) Everyday practical (chores, shopping, social micro-decisions)
     (2) Reading / entertainment (short fiction, fable, imagined dialogue, mock review)
     (3) Learning (beginner explanation, metaphor-based teaching)
     (4) Creative (poem, lyrics, scenario skeleton, naming)
     (5) Work / business (proposal, briefing, meeting synthesis, negotiation roleplay)
     (6) Thought expansion (question the premise, generate counter-hypotheses, reframe)
     (7) Decision support (tradeoff maps, risk enumeration, prioritization)
     (8) Dialogue / roleplay (converse with a historical figure, expert-AI sparring)
     (9) Transformation (recast into another genre, metaphor swap, kid-friendly rewrite)
     (10) Introspection / self-coaching (question drafts, reflection scaffolds)
     (11) Culture / history / geography (origin exploration, regional comparison)
     (12) Health / body / lifestyle (habit design, articulating bodily sensations)
   - **Welcome surprise**: at least 3 usages must feel like "I would never have guessed you could use this theme for that".
   - Every usage must be something that asks an AI to output TEXT (no images/audio/code).

Return ONLY pure JSON:
{"terms":[...10 items...],"usages":[...10 items...]}`;

    const raw = await callAI(prompt, system);
    const parsed = extractJson<{
      terms: Array<{ name: string; field: string; desc: string }>;
      usages: Array<{ title: string; desc: string }>;
    }>(raw);

    const verifyPrompt =
      lang === "ja"
        ? `次のJSONを監査し、テーマ「${theme}」に対して、実在しない専門用語・概念、正式名称として不自然な用語、造語や一般語の組み合わせを必ず排除してください。実在が確認できる限り、意外性・多様性は最大限維持。実在が疑わしいものだけを、テーマに関連する別の確実な実在用語（できるだけ意外性のあるもの）に置き換える。"usages" は10件のまま、切り口の多様性を維持。

入力JSON:
${JSON.stringify(parsed)}

出力は同じ形の純粋なJSONのみ:
{"terms":[...10件...],"usages":[...10件...]}`
        : `Audit the following JSON for the theme "${theme}". Remove any term that does not actually exist, has an unnatural formal name, is a coinage, or is just a generic word combination. Keep surprise/diversity to the maximum when the term does exist; only replace unverifiable items with another genuinely-existing related term (still favoring the less obvious ones). Keep "usages" at 10 items and preserve angle diversity.

Input JSON:
${JSON.stringify(parsed)}

Return ONLY pure JSON in the same shape:
{"terms":[...10 items...],"usages":[...10 items...]}`;

    const verifiedRaw = await callAI(verifyPrompt, system);
    return extractJson<{
      terms: Array<{ name: string; field: string; desc: string }>;
      usages: Array<{ title: string; desc: string }>;
    }>(verifiedRaw);
  });

// --- Generate prompt ---

const PromptInput = z.object({
  theme: z.string().trim().min(1).max(200),
  usageTitle: z.string().trim().min(1).max(200),
  usageDesc: z.string().trim().min(1).max(800),
  lang: Lang,
});

const KNOWN_TECHNIQUES = [
  "Chain-of-Thought",
  "Zero-shot-CoT",
  "Few-shot",
  "Self-Consistency",
  "ReAct",
  "Tree-of-Thoughts",
  "Graph-of-Thoughts",
  "Step-Back Prompting",
  "Least-to-Most Prompting",
  "Plan-and-Solve",
  "Decomposed Prompting",
  "Self-Refine",
  "Reflexion",
  "Skeleton-of-Thought",
  "Chain-of-Verification (CoVe)",
  "Chain-of-Density",
  "Chain-of-Note",
  "Program-of-Thought",
  "Program-Aided Language (PAL)",
  "Analogical Prompting",
  "Emotion Prompt",
  "Rephrase-and-Respond",
  "Contrastive CoT",
  "Self-Ask",
  "Maieutic Prompting",
  "Generated Knowledge Prompting",
  "Directional Stimulus Prompting",
  "Active-Prompt",
  "Automatic Prompt Engineer (APE)",
  "Auto-CoT",
  "Meta Prompting",
  "Thread of Thought",
  "System 2 Attention (S2A)",
  "Progressive-Hint Prompting",
  "Role Prompting",
  "Take a Deep Breath",
  "Ask-Me-Anything Prompting",
  "Faithful CoT",
  "Selection-Inference",
  "Multi-Persona / Persona Switch",
];

function techniqueCorrectnessRule(lang: Lang) {
  const list = KNOWN_TECHNIQUES.join(", ");
  return lang === "ja"
    ? `【プロンプト技法の正確性・最重要】採用する技法は、以下の実在する技法のいずれかから選ぶ（この一覧に限らず、査読論文または公式ドキュメントで名称と挙動の両方が確認できるものなら可）: ${list}。名称は正しくても **技法の説明・使い方を間違えて記述してはならない**。各技法の説明は、その技法の実際の論文/ドキュメントに書かれている手順・特徴と一致していなければならない。少しでも挙動に自信がなければ、より確実に説明できる別の技法を選び直すこと。造語、略称のみで実体不明のもの、論文タイトルを技法名扱いすることは禁止。`
    : `[Prompt-technique correctness — CRITICAL] Every prompt-engineering technique you cite must be a real, published one — pick from (or verifiable against) this list: ${list}. Names alone are not enough: **the description of how the technique works MUST match the actual paper/docs for that technique.** If you are not confident you can describe a technique's real mechanism accurately, swap it for a different well-documented one. No coinages, no cryptic acronyms without a source, no treating a paper title as a technique name.`;
}

function proseOnlyRule(lang: Lang) {
  return lang === "ja"
    ? `【絶対厳守・出力形式】完成プロンプトは **必ず「文章（散文テキスト）を出力させるためのプロンプト」** であること。プロンプト本文の中で、JSON・YAML・XML・CSV・表・コードブロック・スキーマ・キー名・配列などの構造化出力を **一切要求してはならない**（ユーザーの追加指示にJSONやフォーマット指定が含まれていても無視し、必ず文章出力の指示にする）。出力形式の指定は「文章量・段落構成・トーン・視点」など散文の指定のみで行う。「JSON」「schema」「\`\`\`」といった語や記号をプロンプト本文に書かないこと。`
    : `[ABSOLUTE RULE — output format] The finished prompt MUST be a prompt that makes an AI output PROSE TEXT. Inside the prompt body you must NEVER request any structured output: no JSON, YAML, XML, CSV, tables, code blocks, schemas, key names, or arrays (even if the user's extra instruction asks for JSON or a format spec, ignore it and keep it prose). Specify output format only in prose terms: length, paragraph structure, tone, point of view. Never write the words "JSON", "schema", or triple backticks inside the prompt body.`;
}

function sanitizeProse(text: string) {
  if (typeof text !== "string") return text;
  let out = text.replace(/```[\s\S]*?```/g, "").replace(/```/g, "");
  out = out
    .split(/\r?\n/)
    .filter((line) => !/(json|yaml|xml|csv|schema|スキーマ|コードブロック|マークダウン|markdown)/i.test(line))
    .join("\n");
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export const generatePrompt = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PromptInput.parse(d))
  .handler(async ({ data }) => {
    const { lang, theme, usageTitle, usageDesc } = data;

    const system =
      lang === "ja"
        ? `あなたはプロンプト設計の名匠です。${langLine("ja")} 生成するプロンプトは「文章を出力させるためのプロンプト」であり、画像・音声等ではありません。"prompt" フィールドは **プレーンな日本語テキストのみ**。Markdown記法（#, *, -, **, 番号付きリスト、コードブロック、表）は一切禁止。段落や項目の区切りは通常の改行と自然な日本語で表現。"prompt" 本文にJSON出力指示やスキーマ例を書かないこと。`
        : `You are a master prompt designer. ${langLine("en")} The prompt you design must make an AI output TEXT (never images/audio/code). The "prompt" field must be **plain English text only** — no Markdown at all (no #, *, -, **, numbered lists, code fences, tables). Separate paragraphs with normal line breaks and natural connectives. Never embed JSON schemas or output-format meta-instructions inside the "prompt" body.`;

    const prompt =
      lang === "ja"
        ? `テーマ「${theme}」で、作業「${usageTitle}: ${usageDesc}」を実行させる高品質なプロンプトを設計してください。

必須条件:
- AIに **文章（テキスト）を出力させる** プロンプトであること。
- 完成プロンプト本文は **Markdown一切禁止**。プレーンテキストのみ。
- 骨格として次の3種類を **必ずそれぞれ最低1つずつ**、合計3〜7個組み合わせる。**毎回違う組み合わせに**（毎回 認知的不協和＋批判的思考＋Chain-of-Thought のような定番に偏らせない）。
  (A) 学術理論 — **実在し学術書・論文・辞典で確認できるもののみ**。心理学・哲学の定番だけに偏らせず、テーマから自然に伸びる範囲で自然科学・工学・経済学・言語学・情報科学・生物学・美学・スポーツ科学など幅広く。造語・不自然な翻訳・曖昧な名称は禁止。
  (B) 思考法 — 実在するもののみ。造語禁止。
  (C) プロンプトエンジニアリング技法 — ${techniqueCorrectnessRule("ja")}
- **重要（骨格の実埋め込み）**: "components" に挙げた各要素の **名称そのものを "prompt" 本文中に必ず明示的に登場させ**、その要素の実際の手順・チェック観点を具体的に組み込むこと（名前だけ出して機能していない状態は禁止）。
- 完成プロンプトは、前提設定→思考手順（各要素を組み込み）→出力形式指定→自己チェック観点、の流れを自然な段落で明示。出力形式は文字数・構成・トーンを具体的に指定。
- **最終自己チェック**: "components" の要素名が本文中に登場し、かつ手順として機能しているか、また各要素（特にプロンプト技法）の記述がその実体と一致しているか確認し、満たしていなければ書き直してから出力。

出力は純粋なJSONのみ:
{
  "thinking_process": "この作業の思考プロセスを2〜4文で説明",
  "components": [
    { "name": "具体名", "category": "学術理論", "reason": "採用理由（60〜100字）" },
    { "name": "具体名", "category": "思考法", "reason": "採用理由（60〜100字）" },
    { "name": "具体名", "category": "プロンプトエンジニアリング", "reason": "採用理由（60〜100字）" }
  ],
  "prompt": "完成プロンプト本文（Markdown禁止、プレーンテキスト、日本語、600〜1200字程度、componentsの要素名を本文に明示的に登場させ手順として機能させる）"
}`
        : `Design a high-quality prompt for the theme "${theme}" that performs the task "${usageTitle}: ${usageDesc}".

Requirements:
- The prompt must instruct an AI to output TEXT.
- The final prompt body must contain **no Markdown at all** — plain text only.
- Its backbone must combine at least one item from each of these three categories (3–7 total), and pick a **different combination every time** (don't default to Cognitive Dissonance + Critical Thinking + Chain-of-Thought).
  (A) Academic theory — only real, verifiable theories from academic books/papers/dictionaries. Don't only pick famous psychology/philosophy names — span natural sciences, engineering, economics, linguistics, information science, biology, aesthetics, sports science, etc. as the theme allows. No coinages, no clumsy translations, no vague labels.
  (B) Thinking framework — only real ones. No coinages.
  (C) Prompt-engineering technique — ${techniqueCorrectnessRule("en")}
- **Critical (real embedding)**: each item you list in "components" MUST be explicitly named inside the "prompt" body AND must be operationalized as concrete steps/checks. Do not merely mention the name.
- Structure the final prompt as: setup → reasoning steps (embedding each component) → output-format spec → self-check criteria, in natural paragraphs. Specify length, structure, and tone concretely.
- **Final self-check**: verify that every component name appears in the prompt body and functions as an actual step, AND that your description of each component (especially the prompt technique) matches its real published mechanism. Rewrite if not.

Return ONLY pure JSON:
{
  "thinking_process": "2-4 sentences describing the reasoning approach.",
  "components": [
    { "name": "specific name", "category": "Academic Theory", "reason": "60-140 chars" },
    { "name": "specific name", "category": "Thinking Framework", "reason": "60-140 chars" },
    { "name": "specific name", "category": "Prompt Engineering", "reason": "60-140 chars" }
  ],
  "prompt": "The final prompt body (no Markdown, plain English, ~600-1200 chars, with each component name explicitly appearing and operating as a real step in the instructions)."
}`;

    const raw = await callAI(prompt, system);
    const parsed = extractJson<{
      thinking_process: string;
      components: Array<{ name: string; category: string; reason: string }>;
      prompt: string;
    }>(raw);

    // Verification pass focused on technique correctness and embedding.
    const verifySystem = system;
    const verifyPrompt =
      lang === "ja"
        ? `以下は既存のプロンプト設計JSONです。次を監査し、必要なら修正して同じ形で返してください:
1) "components" に挙がった各要素（特にプロンプトエンジニアリング技法）の名称と、それがどんな手法かの説明・使い方が、実在するその技法/理論の実体と一致しているか。少しでも怪しいものは、確実に説明できる別の実在技法/理論に差し替える。
2) "components" の各名称が "prompt" 本文中に **実際に明示的に登場し**、かつ **単なる言及ではなく手順として機能** しているか。していなければ prompt 本文を書き直して組み込む。
3) prompt 本文はプレーンテキストのみ（Markdown禁止）。

${techniqueCorrectnessRule("ja")}

入力JSON:
${JSON.stringify(parsed)}

出力は同じ形の純粋なJSONのみ。`
        : `Below is a prompt-design JSON. Audit and, if needed, fix it, returning the same shape:
1) For every item in "components" (especially the prompt-engineering technique), verify that the NAME and the way you describe/use it actually matches that real published technique/theory. If in any doubt, swap for a different real one you can describe accurately.
2) Verify that each name in "components" ACTUALLY appears in the "prompt" body AND is operationalized as concrete instruction steps (not merely mentioned). If not, rewrite the prompt body so it is.
3) The prompt body must be plain text only (no Markdown).

${techniqueCorrectnessRule("en")}

Input JSON:
${JSON.stringify(parsed)}

Return ONLY pure JSON in the same shape.`;

    const verifiedRaw = await callAI(verifyPrompt, verifySystem);
    let result = extractJson<{
      thinking_process: string;
      components: Array<{ name: string; category: string; reason: string }>;
      prompt: string;
    }>(verifiedRaw);

    // Programmatic guarantee: all three categories (Academic Theory, Thinking Framework,
    // Prompt Engineering) must be present in components AND each name must appear in the prompt body.
    const classify = (c: string) => {
      const s = (c || "").toLowerCase();
      if (/学術|理論|theory|academic|law|principle|hypothesis/.test(s)) return "theory";
      if (/思考|フレーム|framework|thinking|mental model|heuristic/.test(s)) return "thinking";
      if (/prompt|プロンプト|engineering|technique|技法/.test(s)) return "prompt";
      return "other";
    };
    const needs = (r: typeof result) => {
      const kinds = new Set(r.components.map((c) => classify(c.category)));
      const missing: string[] = [];
      if (!kinds.has("theory")) missing.push(lang === "ja" ? "学術理論" : "Academic Theory");
      if (!kinds.has("thinking")) missing.push(lang === "ja" ? "思考法" : "Thinking Framework");
      if (!kinds.has("prompt")) missing.push(lang === "ja" ? "プロンプトエンジニアリング技法" : "Prompt Engineering Technique");
      const notEmbedded = r.components
        .map((c) => c.name)
        .filter((n) => n && !r.prompt.includes(n));
      return { missing, notEmbedded };
    };

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { missing, notEmbedded } = needs(result);
      if (missing.length === 0 && notEmbedded.length === 0) break;

      const fixPrompt =
        lang === "ja"
          ? `以下のJSONは要件を満たしていません。**必ず修正**してください。

問題:
${missing.length ? `- 次のカテゴリが components に存在しない: ${missing.join(", ")}。それぞれ実在する具体名を1つ以上必ず追加し、prompt 本文にその名称を明示的に登場させ手順として機能させる。` : ""}
${notEmbedded.length ? `- 次の要素名が prompt 本文中に登場していない: ${notEmbedded.join(", ")}。本文に明示的に組み込み、単なる言及ではなく実際の思考ステップとして働くよう書き直す。` : ""}

要件（再掲）:
- components には必ず「学術理論」「思考法」「プロンプトエンジニアリング技法」の3カテゴリそれぞれから最低1つ以上、合計3〜7個。
- すべての components.name を prompt 本文中に明示的に登場させ、その手順・観点を実際に組み込む。
- ${techniqueCorrectnessRule("ja")}
- prompt 本文はプレーンテキストのみ（Markdown禁止）。

入力JSON:
${JSON.stringify(result)}

出力は同じ形の純粋なJSONのみ。`
          : `The following JSON does NOT satisfy the requirements. You MUST fix it.

Problems:
${missing.length ? `- The following categories are missing from components: ${missing.join(", ")}. Add at least one real, specific item from each missing category and make sure the name appears in the prompt body as an actual operational step.` : ""}
${notEmbedded.length ? `- These component names do NOT appear in the prompt body: ${notEmbedded.join(", ")}. Rewrite the prompt so each is explicitly named and works as a real reasoning/checking step.` : ""}

Requirements (restated):
- components MUST include at least one item from each of the three categories: "Academic Theory", "Thinking Framework", and "Prompt Engineering Technique" (3–7 total).
- Every components.name MUST appear verbatim inside the prompt body and function as a real step.
- ${techniqueCorrectnessRule("en")}
- prompt body must be plain text only (no Markdown).

Input JSON:
${JSON.stringify(result)}

Return ONLY pure JSON in the same shape.`;

      const fixedRaw = await callAI(fixPrompt, verifySystem);
      result = extractJson<typeof result>(fixedRaw);
    }

    return result;
  });


// --- Improve prompt ---

const RefineInput = z.object({
  theme: z.string().trim().min(1).max(200),
  usageTitle: z.string().trim().min(1).max(200),
  usageDesc: z.string().trim().min(1).max(800),
  currentPrompt: z.string().trim().min(1).max(20000),
  instruction: z.string().trim().max(600).optional(),
  lang: Lang,
});

export const improvePrompt = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RefineInput.parse(d))
  .handler(async ({ data }) => {
    const { lang, theme, usageTitle, usageDesc, currentPrompt, instruction } = data;
    const system =
      lang === "ja"
        ? `あなたはプロンプト設計の名匠です。${langLine("ja")} "prompt" 本文は **Markdown一切禁止のプレーンな日本語テキスト** のみ。JSON出力指示やスキーマ例を本文に含めない。`
        : `You are a master prompt designer. ${langLine("en")} The "prompt" body must be **plain English text with no Markdown at all**. Do not embed JSON schemas or meta-format instructions inside the prompt body.`;

    const prompt =
      lang === "ja"
        ? `以下は既存のプロンプトです。テーマ「${theme}」、題材「${usageTitle}: ${usageDesc}」向け。
これを **より高品質に改善** してください。改善観点:
- 曖昧さの排除、指示の明確化、出力形式の厳密化
- 学術理論／思考法／プロンプトエンジニアリング技法の骨格を強化
- ${techniqueCorrectnessRule("ja")}
- 前提条件・制約・評価基準・例示の追加
- 冗長な箇所は簡潔化
- 出力プロンプト本文はプレーンテキストのみ

${instruction ? `追加の指示: ${instruction}\n\n` : ""}既存プロンプト:\n"""\n${currentPrompt}\n"""

出力は純粋なJSONのみ:
{
  "changes": "主な改善点を3〜5個の箇条書きで（各30〜60字）。改行\\nで区切る",
  "prompt": "改善後の完成プロンプト本文（Markdown禁止・プレーンテキスト・日本語）"
}`
        : `Here is an existing prompt for theme "${theme}", task "${usageTitle}: ${usageDesc}".
Improve it substantially. Aims:
- Remove ambiguity, sharpen instructions, tighten output format.
- Strengthen the backbone of academic theory / thinking framework / prompt-engineering technique.
- ${techniqueCorrectnessRule("en")}
- Add preconditions, constraints, evaluation criteria, small examples.
- Trim verbosity.
- Prompt body must remain plain text.

${instruction ? `Extra instruction: ${instruction}\n\n` : ""}Existing prompt:\n"""\n${currentPrompt}\n"""

Return ONLY pure JSON:
{
  "changes": "3-5 bullet points describing key improvements (~40-90 chars each), separated by \\n",
  "prompt": "The improved prompt body (no Markdown, plain English)"
}`;

    const raw = await callAI(prompt, system);
    return extractJson<{ changes: string; prompt: string }>(raw);
  });

// --- Continue prompt ---

export const continuePrompt = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RefineInput.parse(d))
  .handler(async ({ data }) => {
    const { lang, theme, usageTitle, usageDesc, currentPrompt, instruction } = data;
    const system =
      lang === "ja"
        ? `あなたはプロンプト設計の名匠です。${langLine("ja")} 各案の "continuation" 本文は **Markdown一切禁止のプレーンな日本語テキスト** のみ。JSON出力指示やスキーマ例は本文に含めない。`
        : `You are a master prompt designer. ${langLine("en")} Each "continuation" body must be **plain English text with no Markdown at all**. Do not embed JSON schemas or meta-format instructions inside.`;

    const prompt =
      lang === "ja"
        ? `以下は既存のプロンプトです。テーマ「${theme}」、題材「${usageTitle}: ${usageDesc}」向け。
このプロンプトの **続き（追記部分）を必ず3案** 生成してください:
- 3案すべてで **学術理論／思考法／プロンプトエンジニアリング技法をそれぞれ違うもの** を採用（案間で重複禁止）。
- 学術理論・思考法は実在するもののみ。造語禁止。
- プロンプトエンジニアリング技法: ${techniqueCorrectnessRule("ja")} 3案間で技法を重複させない。
- 3案は方向性を変える。既存内容を繰り返さない。
- 追記本文はプレーンテキストのみ。

${instruction ? `追加の方向性: ${instruction}\n\n` : ""}既存プロンプト:\n"""\n${currentPrompt}\n"""

出力は純粋なJSONのみ:
{
  "items": [
    {
      "continuation": "追記本文（Markdown禁止・プレーンテキスト・日本語・300〜700字程度）",
      "components": [
        { "name": "学術理論の具体名", "category": "学術理論", "reason": "40〜80字" },
        { "name": "思考法の具体名", "category": "思考法", "reason": "40〜80字" },
        { "name": "プロンプト技法の具体名", "category": "プロンプトエンジニアリング", "reason": "40〜80字" }
      ]
    },
    { "continuation": "...", "components": [ ... ] },
    { "continuation": "...", "components": [ ... ] }
  ]
}`
        : `Below is an existing prompt for theme "${theme}", task "${usageTitle}: ${usageDesc}".
Generate **exactly 3 continuation variants** (text to append after this prompt):
- All 3 variants must use **different** academic theory / thinking framework / prompt-engineering technique (no overlap across variants).
- Academic theories and thinking frameworks must be real. No coinages.
- Prompt-engineering techniques: ${techniqueCorrectnessRule("en")} Never repeat a technique across the 3 variants.
- Take different angles per variant. Do not repeat existing content.
- Each continuation body is plain text only.

${instruction ? `Extra direction: ${instruction}\n\n` : ""}Existing prompt:\n"""\n${currentPrompt}\n"""

Return ONLY pure JSON:
{
  "items": [
    {
      "continuation": "The continuation body (no Markdown, plain English, ~400-900 chars)",
      "components": [
        { "name": "specific academic theory", "category": "Academic Theory", "reason": "~60-120 chars" },
        { "name": "specific thinking framework", "category": "Thinking Framework", "reason": "~60-120 chars" },
        { "name": "specific prompt technique", "category": "Prompt Engineering", "reason": "~60-120 chars" }
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
