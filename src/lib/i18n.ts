import { useEffect, useState } from "react";

export type Lang = "ja" | "en";
const STORAGE_KEY = "prompt-atelier-lang";

const jaRaw = {
  brand: "PROMPT ATELIER",
  heroL1: "言葉から思考枠を広げ、",
  heroL2: "新しい視点へ。",
  tagline:
    "興味のある単語を一つ以上入力すると、AIが入力した単語に関連する幅広い専門用語や質問文を生成します。自力ではたどり着けない興味深い概念や思考法を知ったり、新しい視点からAIから意外性のある回答を得るための手助けとなります。★で保存できます。生成されるAIへの質問文は学術理論・思考法・プロンプトエンジニアリング技法を掛け合わせて設計されます。",
  inputLabel: "入力",
  placeholder: "例：星、宝石、朝の光、意思決定、記憶…",
  restart: "最初からやり直す",
  themeError: "生成に失敗しました。少し時間をおいてもう一度お試しください。",
  exploring: "知識空間を探索しています…",
  termsHeading: "関連する専門用語・概念",
  usagesHeading: "このテーマでできること",
  designing: "学術理論・思考法・プロンプト技法を織り込んで設計しています…",
  promptError: "プロンプト生成に失敗しました。もう一度お試しください。",
  footerNote:
    "入力ごとに毎回新しい提案とプロンプトを生成します。保存項目はこの端末に保存されます。",
  savedTitle: "保存済み",
  savedDesc: "この端末に保存された専門用語とプロンプトです。",
  back: "戻る",
  clearAll: "すべて削除",
  clearConfirm: "保存済み項目をすべて削除しますか？",
  tabAll: "すべて",
  tabTerm: "専門用語",
  tabPrompt: "プロンプト",
  emptyList: "まだ保存された項目はありません。ホームで★ボタンから追加できます。",
  themeLabel: "テーマ",
  copy: "コピー",
  copied: "コピーしました",
  copyName: "用語名をコピー",
  copyPrompt: "プロンプトをコピー",
  copyPromptDone: "コピー済み",
  delete: "削除",
  selectedWork: "選択した作業",
  thinkingProcess: "思考プロセスの設計",
  components: "採用した構成要素",
  finalPrompt: "完成プロンプト",
  improve: "プロンプトを改善",
  improveError: "改善に失敗しました。もう一度お試しください。",
  improveInstructionLabel: "改善指示（任意）",
  improveInstructionPlaceholder: "例：もっと具体例を増やす／読みやすくする／専門用語を減らす／論理構成を強化する",
  improveApply: "この指示で改善",
  improveDefault: "指示なしで改善",
  changes: "改善点",
  saved: "保存済み",
  save: "保存",
  continuationsHeading: "プロンプトの続き（3案）",
  regen3: "3案を再生成",
  gen3: "続きを3案生成",
  contError: "続きの生成に失敗しました。もう一度お試しください。",
  contShortError: "続きの生成に失敗しました。",
  caseN: (n: number) => `案 ${n}`,
  childHeading: (n: number) => `案 ${n} の続き（3案）`,
  copyContOnly: "続きのみコピー",
  copyFull: "全文コピー",
  regenChild: "この案の続きを再生成",
  genChild: "この案の続きを3案生成",
  saveThis: "この案を保存",
  unsave: "保存を解除",
  langLabel: "言語",
  metaTitle: "Prompt Atelier — 言葉を、目的とプロンプトへ。",
  metaDesc:
    "単語やテーマから、学術理論・思考法・プロンプトエンジニアリングを掛け合わせた高品質な文章生成プロンプトをつくるアトリエ。",
};

export type Dict = {
  [K in keyof typeof jaRaw]: typeof jaRaw[K] extends (n: number) => string
    ? (n: number) => string
    : string;
};

const enRaw: Dict = {
  brand: "PROMPT ATELIER",
  heroL1: "Expand your thinking frame from a word,",
  heroL2: "into a new perspective.",
  tagline:
    "Enter one or more words of interest, and the AI will generate a wide range of specialized terms and questions related to your input. It helps you discover fascinating concepts and thinking methods you couldn't reach on your own, and get surprising answers from AI through a fresh perspective. You can save with ★. The generated questions for AI are designed by combining academic theories, thinking frameworks, and prompt-engineering techniques.",
  inputLabel: "Input",
  placeholder: "e.g. stars, gemstones, morning light, decision-making, memory…",
  restart: "Start over",
  themeError: "Generation failed. Please try again in a moment.",
  exploring: "Exploring the knowledge space…",
  termsHeading: "Related terms & concepts",
  usagesHeading: "What you can do with this theme",
  designing: "Designing with academic theories, thinking methods, and prompt techniques…",
  promptError: "Prompt generation failed. Please try again.",
  footerNote:
    "Every input generates fresh suggestions and prompts. Saved items live on this device.",
  savedTitle: "Saved",
  savedDesc: "Terms and prompts saved on this device.",
  back: "Back",
  clearAll: "Clear all",
  clearConfirm: "Delete all saved items?",
  tabAll: "All",
  tabTerm: "Terms",
  tabPrompt: "Prompts",
  emptyList: "Nothing saved yet. Use the ★ button on the home page to add items.",
  themeLabel: "Theme",
  copy: "Copy",
  copied: "Copied",
  copyName: "Copy term name",
  copyPrompt: "Copy prompt",
  copyPromptDone: "Copied",
  delete: "Delete",
  selectedWork: "Selected task",
  thinkingProcess: "Designed thinking process",
  components: "Selected components",
  finalPrompt: "Final prompt",
  improve: "Improve prompt",
  improveError: "Improvement failed. Please try again.",
  improveInstructionLabel: "Improvement instruction (optional)",
  improveInstructionPlaceholder: "e.g. add more concrete examples / make it easier to read / reduce jargon / strengthen logical structure",
  improveApply: "Improve with this instruction",
  improveDefault: "Improve without instruction",
  changes: "What changed",
  saved: "Saved",
  save: "Save",
  continuationsHeading: "Prompt continuations (3 variants)",
  regen3: "Regenerate 3 variants",
  gen3: "Generate 3 continuations",
  contError: "Failed to generate continuations. Please try again.",
  contShortError: "Continuation failed.",
  caseN: (n: number) => `Variant ${n}`,
  childHeading: (n: number) => `Variant ${n} continuations (3)`,
  copyContOnly: "Copy continuation",
  copyFull: "Copy full text",
  regenChild: "Regenerate this variant's continuations",
  genChild: "Generate 3 continuations for this variant",
  saveThis: "Save this variant",
  unsave: "Unsave",
  langLabel: "Language",
  metaTitle: "Prompt Atelier — From words to purpose and prompts.",
  metaDesc:
    "An atelier that turns any word or theme into high-quality writing prompts, weaving academic theory, thinking frameworks, and prompt engineering.",
};

const dict: Record<Lang, Dict> = { ja: jaRaw as Dict, en: enRaw };

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>("ja");
  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved === "ja" || saved === "en") {
      setLang(saved);
      return;
    }
    const nav =
      typeof navigator !== "undefined" ? navigator.language?.toLowerCase() ?? "" : "";
    setLang(nav.startsWith("ja") ? "ja" : "en");
  }, []);
  const set = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  };
  return [lang, set];
}

export function useT(): [Dict, Lang, (l: Lang) => void] {
  const [lang, setLang] = useLang();
  return [dict[lang], lang, setLang];
}
