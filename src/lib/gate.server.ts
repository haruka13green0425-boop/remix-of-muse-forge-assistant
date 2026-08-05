import { generateText } from "ai";

const MODEL = "google/gemini-2.5-flash";


export async function callAI(prompt: string, system: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const { createLovableGateway } = await import("./ai-gateway.server");
  const gateway = createLovableGateway(key);
  const { text } = await generateText({
    model: gateway(MODEL),
    system,
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
