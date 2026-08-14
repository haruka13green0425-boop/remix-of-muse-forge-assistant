import { generateText } from "ai";

const MODEL = "google/gemini-2.5-flash";

const TECHNIQUE_DISTINCTIVENESS_RULE = `
【プロンプト技法の用途の明確化・最重要】
プロンプトエンジニアリング技法を採用するときは、技法名を付けるだけでなく、その技法固有の目的・操作・適用場面が実際のプロンプト本文に反映されていること。
複数の技法について「順番に考える」「問題を分解する」「答えを見直す」「例を示す」「別の視点から考える」など、他の技法にもそのまま当てはまる一般的な指示だけを書くのは禁止。
各技法について、他の技法では代用できない、または少なくとも明確に区別できる固有の手順・構造・判断基準を特定してから本文へ組み込むこと。
技法の説明を一文だけ取り出したときに、別の技法の説明とほぼ同じ意味になる場合は、その技法の選定または説明をやり直すこと。
「この技法を用いよ」という名称だけの指示、技法名に一般的な思考指示を付けただけのもの、技法の実体を説明せず名称だけで役割を済ませるものは禁止。
技法を使う理由も、そのテーマ・題材においてその技法固有の働きが必要だからだと説明できるものだけを採用すること。
技法同士の違いが曖昧になる場合は、無理に技法数を増やさず、より用途が明確で正確に説明できる技法だけを採用すること。
`;

export async function callAI(prompt: string, system: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const { createLovableGateway } = await import("./ai-gateway.server");
  const gateway = createLovableGateway(key);
  const { text } = await generateText({
    model: gateway(MODEL),
    system: `${system}\n\n${TECHNIQUE_DISTINCTIVENESS_RULE}`,
    prompt,
    temperature: 0.9,
  });
  return text;
}

function stripJsonFence(text: string) {
  return text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/```\s*$/g, "")
    .trim();
}

function pickJsonObject(text: string) {
  const start = text.search(/[\{\[]/);
  if (start === -1) throw new Error("No JSON in response");

  const opener = text[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === opener) {
      depth += 1;
    } else if (ch === closer) {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  const fallbackEnd = text.lastIndexOf(closer);
  if (fallbackEnd === -1 || fallbackEnd < start) throw new Error("No complete JSON in response");
  return text.slice(start, fallbackEnd + 1);
}

function removeTrailingCommas(json: string) {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i += 1) {
    const ch = json[i];
    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }

    if (ch === ",") {
      let j = i + 1;
      while (/\s/.test(json[j] ?? "")) j += 1;
      if (json[j] === "}" || json[j] === "]") continue;
    }
    out += ch;
  }
  return out;
}

function repairJsonStringEscapes(json: string) {
  let out = "";
  let inString = false;

  for (let i = 0; i < json.length; i += 1) {
    const ch = json[i];

    if (!inString) {
      out += ch;
      if (ch === '"') inString = true;
      continue;
    }

    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }

    if (ch === "\n") {
      out += "\\n";
      continue;
    }
    if (ch === "\r") {
      out += "\\r";
      continue;
    }
    if (ch === "\t") {
      out += "\\t";
      continue;
    }

    if (ch !== "\\") {
      out += ch;
      continue;
    }

    const next = json[i + 1];
    if (!next) {
      out += "\\\\";
      continue;
    }

    if ('"\\/bfnrt'.includes(next)) {
      out += ch + next;
      i += 1;
      continue;
    }

    if (next === "u" && /^[0-9a-fA-F]{4}$/.test(json.slice(i + 2, i + 6))) {
      out += json.slice(i, i + 6);
      i += 5;
      continue;
    }

    out += "\\\\";
  }

  return out;
}

export function extractJson<T>(text: string): T {
  const json = pickJsonObject(stripJsonFence(text));
  const attempts = [
    json,
    removeTrailingCommas(json),
    repairJsonStringEscapes(removeTrailingCommas(json)),
    repairJsonStringEscapes(removeTrailingCommas(json)).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""),
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Invalid JSON response");
}
