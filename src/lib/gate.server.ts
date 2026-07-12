import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { generateText } from "ai";

const MODEL = "google/gemini-2.5-flash";
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type UnlockPayload = {
  unlocked: true;
  iat: number;
  exp: number;
  nonce: string;
};

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

function sign(encodedPayload: string) {
  return createHmac("sha256", sessionSecret()).update(encodedPayload).digest("base64url");
}

export function passwordMatches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export function createUnlockToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload: UnlockPayload = {
    unlocked: true,
    iat: now,
    exp: now + TOKEN_MAX_AGE_SECONDS,
    nonce: randomBytes(16).toString("base64url"),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyUnlockToken(token?: string | null) {
  if (!token) return false;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  const expectedSignature = sign(encodedPayload);
  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<UnlockPayload>;
    return payload.unlocked === true && typeof payload.exp === "number" && payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export function requireUnlockToken(token?: string | null) {
  if (!verifyUnlockToken(token)) throw new Error("ログインが必要です");
}

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
