import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

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
const MIGRATED_KEY = `${SAVED_KEY}:migrated`;

function loadLegacySaved(): SavedItem[] {
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

function isSavedItem(value: unknown): value is SavedItem {
  if (!value || typeof value !== "object") return false;
  const item = value as { id?: unknown; type?: unknown; createdAt?: unknown };
  return (
    typeof item.id === "string" &&
    (item.type === "term" || item.type === "prompt") &&
    typeof item.createdAt === "number"
  );
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Authentication required");
  return data.user.id;
}

export async function loadSaved(): Promise<SavedItem[]> {
  const userId = await currentUserId();
  const migrationKey = `${MIGRATED_KEY}:${userId}`;

  if (typeof window !== "undefined" && !localStorage.getItem(migrationKey)) {
    const legacy = loadLegacySaved();
    if (legacy.length > 0) {
      const { error } = await supabase.from("saved_items").upsert(
        legacy.map((item) => ({
          user_id: userId,
          item_key: item.id,
          item_type: item.type,
          data: item as unknown as Json,
        })),
        { onConflict: "user_id,item_key" },
      );
      if (error) throw error;
    }
    localStorage.setItem(migrationKey, "1");
    localStorage.removeItem(SAVED_KEY);
  }

  const { data, error } = await supabase
    .from("saved_items")
    .select("data")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => row.data).filter(isSavedItem);
}

export async function saveItem(item: SavedItem): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase.from("saved_items").upsert(
    {
      user_id: userId,
      item_key: item.id,
      item_type: item.type,
      data: item as unknown as Json,
    },
    { onConflict: "user_id,item_key" },
  );
  if (error) throw error;
}

export async function removeSaved(id: string): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase
    .from("saved_items")
    .delete()
    .eq("user_id", userId)
    .eq("item_key", id);
  if (error) throw error;
}

export async function clearSaved(): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase.from("saved_items").delete().eq("user_id", userId);
  if (error) throw error;
}

export function termId(theme: string, name: string) {
  return `term:${theme}:${name}`;
}

export function promptId(theme: string, usageTitle: string, promptText: string) {
  return `prompt:${theme}:${usageTitle}:${promptText.slice(0, 60)}`;
}
