export type SavedTerm = {
  id: string;
  type: "term";
  createdAt: number;
  theme: string;
  name: string;
  field: string;
  desc: string;
};

export type SavedPrompt = {
  id: string;
  type: "prompt";
  createdAt: number;
  theme: string;
  usageTitle: string;
  usageDesc: string;
  promptText: string;
  components: Array<{ name: string; category: string; reason: string }>;
};

export type SavedItem = SavedTerm | SavedPrompt;

export const SAVED_KEY = "prompt-atelier-saved-v2";

export function loadSaved(): SavedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedItem[]) : [];
  } catch {
    return [];
  }
}

export function writeSaved(items: SavedItem[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(items));
  } catch {}
}

export function termId(theme: string, name: string) {
  return `term:${theme}:${name}`;
}

export function promptId(theme: string, usageTitle: string, promptText: string) {
  return `prompt:${theme}:${usageTitle}:${promptText.slice(0, 60)}`;
}
