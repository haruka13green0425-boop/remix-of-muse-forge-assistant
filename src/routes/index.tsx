import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Star,
  Loader2,
  Wand2,
  PlusCircle,
} from "lucide-react";
import {
  exploreTheme,
  generatePrompt,
  improvePrompt,
  continuePrompt,
} from "@/lib/gate.functions";
import {
  loadSaved,
  writeSaved,
  termId,
  promptId,
  type SavedItem,
} from "@/lib/saved";
import { useT, type Dict, type Lang } from "@/lib/i18n";
import { AdSlot } from "@/components/AdSlot";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prompt Atelier — 言葉を、目的とプロンプトへ。" },
      {
        name: "description",
        content:
          "単語やテーマから、学術理論・思考法・プロンプトエンジニアリング技法を掛け合わせた高品質な文章生成プロンプトをつくるアトリエ。/ An atelier that turns any word or theme into high-quality writing prompts weaving academic theory, thinking frameworks, and prompt engineering.",
      },
      { property: "og:title", content: "Prompt Atelier" },
      {
        property: "og:description",
        content: "Turn any word into a purpose and a high-quality writing prompt.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Home,
});

type Term = { name: string; field: string; desc: string };
type Usage = { title: string; desc: string };
type Component = { name: string; category: string; reason: string };
type PromptResult = {
  thinking_process: string;
  components: Component[];
  prompt: string;
};
type ContinuationItem = { continuation: string; components: Component[] };
type ContinuationBranch = {
  id: string;
  basePrompt: string;
  items: Array<ContinuationItem & { child?: ContinuationBranch }>;
};

function LangToggle({
  lang,
  setLang,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5 text-[10px] font-medium tracking-wider">
      {([
        { key: "ja", label: "日本語" },
        { key: "en", label: "English" },
      ] as const).map((l) => (
        <button
          key={l.key}
          type="button"
          onClick={() => setLang(l.key)}
          className={cn(
            "rounded-full px-2.5 py-1 transition-colors",
            lang === l.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function CopyButton({
  text,
  label,
  className,
  size = "sm",
}: {
  text: string;
  label?: string;
  className?: string;
  size?: "sm" | "icon";
}) {
  const [t] = useT();
  const [copied, setCopied] = useState(false);
  const displayLabel = label ?? t.copy;

  async function onCopy(e: React.MouseEvent) {
    e.stopPropagation();
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
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (size === "icon") {
    return (
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? t.copied : displayLabel}
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          className,
        )}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? t.copied : displayLabel}
    </button>
  );
}

function Home() {
  const [t, lang, setLang] = useT();
  const explore = useServerFn(exploreTheme);
  const genPrompt = useServerFn(generatePrompt);

  const [input, setInput] = useState("");
  const [theme, setTheme] = useState<string | null>(null);
  const [terms, setTerms] = useState<Term[] | null>(null);
  const [usages, setUsages] = useState<Usage[] | null>(null);
  const [loadingTheme, setLoadingTheme] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);

  const [selectedUsage, setSelectedUsage] = useState<Usage | null>(null);
  const [prompt, setPrompt] = useState<PromptResult | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  const [saved, setSaved] = useState<SavedItem[]>([]);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  function updateSaved(next: SavedItem[]) {
    setSaved(next);
    writeSaved(next);
  }

  function toggleSaved(item: SavedItem) {
    const exists = saved.some((s) => s.id === item.id);
    updateSaved(exists ? saved.filter((s) => s.id !== item.id) : [item, ...saved]);
  }

  const savedIds = useMemo(() => new Set(saved.map((s) => s.id)), [saved]);

  async function onExplore(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim();
    if (!value || loadingTheme) return;
    setLoadingTheme(true);
    setThemeError(null);
    setTerms(null);
    setUsages(null);
    setPrompt(null);
    setSelectedUsage(null);
    setTheme(value);
    try {
      const res = await explore({ data: { theme: value, lang } });
      setTerms(res.terms);
      setUsages(res.usages);
    } catch (err) {
      console.error(err);
      setThemeError(t.themeError);
    } finally {
      setLoadingTheme(false);
    }
  }

  async function onPickUsage(u: Usage) {
    if (!theme || loadingPrompt) return;
    setSelectedUsage(u);
    setPrompt(null);
    setPromptError(null);
    setLoadingPrompt(true);
    try {
      const res = await genPrompt({
        data: { theme, usageTitle: u.title, usageDesc: u.desc, lang },
      });
      setPrompt(res);
      setTimeout(() => {
        document.getElementById("prompt-panel")?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } catch (err) {
      console.error(err);
      setPromptError(t.promptError);
    } finally {
      setLoadingPrompt(false);
    }
  }

  function reset() {
    setInput("");
    setTheme(null);
    setTerms(null);
    setUsages(null);
    setPrompt(null);
    setSelectedUsage(null);
    setThemeError(null);
    setPromptError(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-6 pb-24 pt-14 sm:px-8">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-xs tracking-[0.28em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t.brand}
          </div>
          <div className="flex items-center gap-2">
            <LangToggle lang={lang} setLang={setLang} />
            <Link
              to="/saved"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Star className="h-3.5 w-3.5" />
              {saved.length}
            </Link>
          </div>
        </header>

        <h1 className="mt-8 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
          {t.heroL1}
          <br />
          {t.heroL2}
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">{t.tagline}</p>

        <form onSubmit={onExplore} className="mt-12">
          <label className="text-xs tracking-widest text-muted-foreground">{t.inputLabel}</label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm focus-within:border-primary/50">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.placeholder}
              className="flex-1 bg-transparent px-3 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground/70"
              disabled={loadingTheme}
            />
            <button
              type="submit"
              disabled={loadingTheme || !input.trim()}
              aria-label="Generate"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              {loadingTheme ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          </div>
          {theme && (
            <button
              type="button"
              onClick={reset}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              {t.restart}
            </button>
          )}
          {themeError && <p className="mt-3 text-sm text-destructive">{themeError}</p>}
        </form>

        {loadingTheme && (
          <div className="mt-14 flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {t.exploring}
          </div>
        )}

        {terms && (
          <section className="mt-14">
            <h2 className="text-xs tracking-widest text-muted-foreground">{t.termsHeading}</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {terms.map((term, i) => {
                const id = termId(theme ?? "", term.name);
                const isFav = savedIds.has(id);
                return (
                  <article
                    key={i}
                    className="group relative rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
                  >
                    <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <CopyButton text={term.name} size="icon" label={term.name} />
                      <button
                        type="button"
                        onClick={() =>
                          toggleSaved({
                            id,
                            type: "term",
                            createdAt: Date.now(),
                            theme: theme ?? "",
                            name: term.name,
                            field: term.field,
                            desc: term.desc,
                          })
                        }
                        aria-label={isFav ? t.unsave : t.save}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <Star className={cn("h-3.5 w-3.5", isFav && "fill-primary text-primary")} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pr-16">
                      <h3 className="text-sm font-semibold text-foreground">{term.name}</h3>
                      <span className="text-[10px] tracking-wider text-muted-foreground">
                        {term.field}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{term.desc}</p>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {usages && (
          <section className="mt-12">
            <h2 className="text-xs tracking-widest text-muted-foreground">{t.usagesHeading}</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {usages.map((u, i) => {
                const active = selectedUsage?.title === u.title;
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => onPickUsage(u)}
                    disabled={loadingPrompt}
                    className={cn(
                      "group rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:bg-accent/30",
                      active && "border-primary/70 bg-accent/40",
                      loadingPrompt && !active && "opacity-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{u.title}</h3>
                      {active && loadingPrompt && (
                        <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{u.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {(loadingPrompt || prompt || promptError) && (
          <section id="prompt-panel" className="mt-14 border-t border-border pt-10">
            {loadingPrompt && !prompt && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                {t.designing}
              </div>
            )}
            {promptError && <p className="text-sm text-destructive">{promptError}</p>}
            {prompt && (
              <PromptView
                data={prompt}
                usage={selectedUsage}
                theme={theme}
                lang={lang}
                dict={t}
                savedIds={savedIds}
                onToggleSaved={toggleSaved}
                onUpdate={setPrompt}
              />
            )}
          </section>
        )}

        <AdSlot />

        <footer className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          {t.footerNote}
        </footer>
      </div>
    </div>
  );
}

function PromptView({
  data,
  usage,
  theme,
  lang,
  dict,
  savedIds,
  onToggleSaved,
  onUpdate,
}: {
  data: PromptResult;
  usage: Usage | null;
  theme: string | null;
  lang: Lang;
  dict: Dict;
  savedIds: Set<string>;
  onToggleSaved: (item: SavedItem) => void;
  onUpdate: (next: PromptResult) => void;
}) {
  const improve = useServerFn(improvePrompt);
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [lastChanges, setLastChanges] = useState<string | null>(null);
  const [improveInstruction, setImproveInstruction] = useState("");

  const [rootBranch, setRootBranch] = useState<ContinuationBranch | null>(null);

  const id = promptId(theme ?? "", usage?.title ?? "custom", data.prompt);
  const isFav = savedIds.has(id);

  async function onImprove() {
    if (!theme || !usage || refining) return;
    setRefining(true);
    setRefineError(null);
    try {
      const instr = improveInstruction.trim();
      const res = await improve({
        data: {
          theme,
          usageTitle: usage.title,
          usageDesc: usage.desc,
          currentPrompt: data.prompt,
          lang,
          ...(instr ? { instruction: instr } : {}),
        },
      });
      setLastChanges(res.changes);
      onUpdate({ ...data, prompt: res.prompt });
      setRootBranch(null);
    } catch (e) {
      console.error(e);
      setRefineError(dict.improveError);
    } finally {
      setRefining(false);
    }
  }

  return (
    <div className="space-y-8">
      {usage && (
        <div>
          <div className="text-xs tracking-widest text-muted-foreground">{dict.selectedWork}</div>
          <h3 className="mt-1 text-lg font-semibold text-foreground">{usage.title}</h3>
        </div>
      )}

      <div>
        <h4 className="text-xs tracking-widest text-muted-foreground">{dict.thinkingProcess}</h4>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{data.thinking_process}</p>
      </div>

      <div>
        <h4 className="text-xs tracking-widest text-muted-foreground">{dict.components}</h4>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {data.components.map((c, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <div className="text-[10px] tracking-wider text-primary">{c.category}</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{c.name}</div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.reason}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-xs tracking-widest text-muted-foreground">{dict.finalPrompt}</h4>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onImprove}
              disabled={refining}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              {refining ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              {dict.improve}
            </button>
            <button
              type="button"
              onClick={() =>
                theme &&
                usage &&
                onToggleSaved({
                  id,
                  type: "prompt",
                  createdAt: Date.now(),
                  theme,
                  usageTitle: usage.title,
                  usageDesc: usage.desc,
                  promptText: data.prompt,
                  components: data.components,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Star className={cn("h-3.5 w-3.5", isFav && "fill-primary text-primary")} />
              {isFav ? dict.saved : dict.save}
            </button>
            <CopyButton text={data.prompt} label={dict.copyPrompt} />
          </div>
        </div>
        {refineError && <p className="mt-3 text-xs text-destructive">{refineError}</p>}
        {lastChanges && (
          <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs leading-relaxed text-foreground">
            <div className="mb-1 text-[10px] tracking-widest text-primary">{dict.changes}</div>
            <pre className="whitespace-pre-wrap font-sans">{lastChanges}</pre>
          </div>
        )}
        <pre className="mt-3 max-h-[720px] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-card p-5 text-sm leading-relaxed text-foreground">
          {data.prompt}
        </pre>
      </div>

      {theme && usage && (
        <ContinuationsSection
          theme={theme}
          usage={usage}
          lang={lang}
          dict={dict}
          basePrompt={data.prompt}
          branch={rootBranch}
          onBranchChange={setRootBranch}
          savedIds={savedIds}
          onToggleSaved={onToggleSaved}
        />
      )}
    </div>
  );
}

function ContinuationsSection({
  theme,
  usage,
  lang,
  dict,
  basePrompt,
  branch,
  onBranchChange,
  savedIds,
  onToggleSaved,
}: {
  theme: string;
  usage: Usage;
  lang: Lang;
  dict: Dict;
  basePrompt: string;
  branch: ContinuationBranch | null;
  onBranchChange: (b: ContinuationBranch | null) => void;
  savedIds: Set<string>;
  onToggleSaved: (item: SavedItem) => void;
}) {
  const cont = useServerFn(continuePrompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await cont({
        data: {
          theme,
          usageTitle: usage.title,
          usageDesc: usage.desc,
          currentPrompt: basePrompt,
          lang,
        },
      });
      onBranchChange({
        id: `br-${Date.now()}`,
        basePrompt,
        items: res.items.slice(0, 3).map((it) => ({ ...it })),
      });
    } catch (e) {
      console.error(e);
      setError(dict.contError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-t border-border pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-xs tracking-widest text-muted-foreground">
          {dict.continuationsHeading}
        </h4>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <PlusCircle className="h-3.5 w-3.5" />
          )}
          {branch ? dict.regen3 : dict.gen3}
        </button>
      </div>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      {branch && (
        <BranchView
          theme={theme}
          usage={usage}
          lang={lang}
          dict={dict}
          branch={branch}
          onChange={(b) => onBranchChange(b)}
          savedIds={savedIds}
          onToggleSaved={onToggleSaved}
        />
      )}
    </div>
  );
}

function BranchView({
  theme,
  usage,
  lang,
  dict,
  branch,
  onChange,
  savedIds,
  onToggleSaved,
}: {
  theme: string;
  usage: Usage;
  lang: Lang;
  dict: Dict;
  branch: ContinuationBranch;
  onChange: (b: ContinuationBranch) => void;
  savedIds: Set<string>;
  onToggleSaved: (item: SavedItem) => void;
}) {
  return (
    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
      {branch.items.map((item, i) => (
        <ContinuationCard
          key={i}
          index={i}
          theme={theme}
          usage={usage}
          lang={lang}
          dict={dict}
          basePrompt={branch.basePrompt}
          item={item}
          onChildChange={(child) => {
            const nextItems = branch.items.map((it, j) =>
              j === i ? { ...it, child: child ?? undefined } : it,
            );
            onChange({ ...branch, items: nextItems });
          }}
          savedIds={savedIds}
          onToggleSaved={onToggleSaved}
        />
      ))}
    </div>
  );
}

function ContinuationCard({
  index,
  theme,
  usage,
  lang,
  dict,
  basePrompt,
  item,
  onChildChange,
  savedIds,
  onToggleSaved,
}: {
  index: number;
  theme: string;
  usage: Usage;
  lang: Lang;
  dict: Dict;
  basePrompt: string;
  item: ContinuationItem & { child?: ContinuationBranch };
  onChildChange: (b: ContinuationBranch | null) => void;
  savedIds: Set<string>;
  onToggleSaved: (item: SavedItem) => void;
}) {
  const fullPromptText = `${basePrompt}\n\n${item.continuation}`;
  const savedId = promptId(theme, `${usage.title} / #${index + 1}`, fullPromptText);
  const isFav = savedIds.has(savedId);
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] tracking-widest text-primary">{dict.caseN(index + 1)}</div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onToggleSaved({
                  id: savedId,
                  type: "prompt",
                  createdAt: Date.now(),
                  theme,
                  usageTitle: `${usage.title} / ${dict.caseN(index + 1)}`,
                  usageDesc: usage.desc,
                  promptText: fullPromptText,
                  components: item.components.map((c) => ({ ...c, reason: "" })),
                })
              }
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-accent"
              aria-label={isFav ? dict.unsave : dict.saveThis}
            >
              <Star className={cn("h-3 w-3", isFav && "fill-primary text-primary")} />
              {isFav ? dict.saved : dict.save}
            </button>
            <CopyButton text={item.continuation} label={dict.copyContOnly} />
            <CopyButton text={fullPromptText} label={dict.copyFull} />
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          {item.components.map((c, ci) => (
            <div key={ci} className="flex flex-wrap items-baseline gap-x-2 text-[11px]">
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] tracking-wider text-primary">
                {c.category}
              </span>
              <span className="font-semibold text-foreground">{c.name}</span>
            </div>
          ))}
        </div>
        <pre className="mt-3 max-h-[380px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-xs leading-relaxed text-foreground">
          {item.continuation}
        </pre>
        <ContinueOnCard
          theme={theme}
          usage={usage}
          lang={lang}
          dict={dict}
          basePrompt={fullPromptText}
          hasChild={!!item.child}
          onGenerated={(child) => onChildChange(child)}
        />
      </div>
      {item.child && (
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
          <div className="mb-2 text-[10px] tracking-widest text-primary">
            {dict.childHeading(index + 1)}
          </div>
          <BranchView
            theme={theme}
            usage={usage}
            lang={lang}
            dict={dict}
            branch={item.child}
            onChange={(b) => onChildChange(b)}
            savedIds={savedIds}
            onToggleSaved={onToggleSaved}
          />
        </div>
      )}
    </div>
  );
}

function ContinueOnCard({
  theme,
  usage,
  lang,
  dict,
  basePrompt,
  hasChild,
  onGenerated,
}: {
  theme: string;
  usage: Usage;
  lang: Lang;
  dict: Dict;
  basePrompt: string;
  hasChild: boolean;
  onGenerated: (b: ContinuationBranch) => void;
}) {
  const cont = useServerFn(continuePrompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await cont({
        data: {
          theme,
          usageTitle: usage.title,
          usageDesc: usage.desc,
          currentPrompt: basePrompt,
          lang,
        },
      });
      onGenerated({
        id: `br-${Date.now()}`,
        basePrompt,
        items: res.items.slice(0, 3).map((it) => ({ ...it })),
      });
    } catch (e) {
      console.error(e);
      setError(dict.contShortError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <PlusCircle className="h-3.5 w-3.5" />
        )}
        {hasChild ? dict.regenChild : dict.genChild}
      </button>
      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
