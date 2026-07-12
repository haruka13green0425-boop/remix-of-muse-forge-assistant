import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Check, Star, Trash2 } from "lucide-react";
import { loadSaved, writeSaved, type SavedItem } from "@/lib/saved";
import { AUTH_TOKEN_KEY } from "@/lib/gate.constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "保存済み — Prompt Atelier" },
      { name: "description", content: "保存した専門用語とプロンプトを一覧表示します。" },
    ],
  }),
  component: SavedPage,
});

function useCopy() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {}
      document.body.removeChild(ta);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
  }
  return { copiedId, copy };
}

function SavedPage() {
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [tab, setTab] = useState<"all" | "term" | "prompt">("all");
  const { copiedId, copy } = useCopy();

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.navigate({ to: "/unlock", replace: true });
      return;
    }
    setItems(loadSaved());
  }, [router]);

  const filtered = useMemo(() => {
    if (tab === "all") return items;
    return items.filter((i) => i.type === tab);
  }, [items, tab]);

  function remove(id: string) {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    writeSaved(next);
  }

  function clearAll() {
    if (!confirm("保存済み項目をすべて削除しますか？")) return;
    setItems([]);
    writeSaved([]);
  }

  const termCount = items.filter((i) => i.type === "term").length;
  const promptCount = items.filter((i) => i.type === "prompt").length;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-6 pb-24 pt-14 sm:px-8">
        <header className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            戻る
          </Link>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              すべて削除
            </button>
          )}
        </header>

        <h1 className="mt-8 flex items-center gap-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          <Star className="h-6 w-6 fill-primary text-primary" />
          保存済み
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          この端末に保存された専門用語とプロンプトです。
        </p>

        <div className="mt-8 flex gap-2 border-b border-border">
          {(
            [
              { key: "all", label: `すべて (${items.length})` },
              { key: "term", label: `専門用語 (${termCount})` },
              { key: "prompt", label: `プロンプト (${promptCount})` },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3 py-2 text-xs transition-colors",
                tab === t.key
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-16 rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            まだ保存された項目はありません。ホームで★ボタンから追加できます。
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filtered.map((item) =>
              item.type === "term" ? (
                <article
                  key={item.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                        <span className="text-[10px] tracking-wider text-muted-foreground">
                          {item.field}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[10px] tracking-widest text-primary">
                        テーマ：{item.theme}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => copy(item.id, item.name)}
                        aria-label="用語名をコピー"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        {copiedId === item.id ? (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        aria-label="削除"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                </article>
              ) : (
                <article
                  key={item.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{item.usageTitle}</h3>
                      <div className="mt-0.5 text-[10px] tracking-widest text-primary">
                        テーマ：{item.theme}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => copy(item.id, item.promptText)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-primary" />
                            コピー済み
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            プロンプトをコピー
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        aria-label="削除"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {item.usageDesc}
                  </p>
                  {item.components?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.components.map((c, i) => (
                        <span
                          key={i}
                          className="rounded bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
                        >
                          {c.category}: {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <pre className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-xs leading-relaxed text-foreground">
                    {item.promptText}
                  </pre>
                </article>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
