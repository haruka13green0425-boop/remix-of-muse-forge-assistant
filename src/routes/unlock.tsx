import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Lock } from "lucide-react";
import { unlockSite } from "@/lib/gate.functions";
import { AUTH_TOKEN_KEY } from "@/lib/gate.constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/unlock")({
  head: () => ({
    meta: [
      { title: "パスワードを入力 — Prompt Atelier" },
      { name: "description", content: "招待制のプロンプト工房。パスワードを入力して入室してください。" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Unlock,
});

function Unlock() {
  const router = useRouter();
  const unlock = useServerFn(unlockSite);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const result = await unlock({ data: { password } });
      if (result.ok) {
        localStorage.setItem(AUTH_TOKEN_KEY, result.token);
        await router.navigate({ to: "/" });
      }
      else setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm"
      >
        <div className="mb-6 flex items-center gap-2 text-xs tracking-[0.25em] text-primary">
          <Lock className="h-3.5 w-3.5" />
          RESTRICTED
        </div>
        <h1 className="text-2xl font-semibold text-foreground">パスワードを入力</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          このアトリエは招待制です。パスワードを入力してください。
        </p>
        <div className="mt-6 space-y-4">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="h-11 border-primary/40 focus-visible:ring-primary"
          />
          {error && <p className="text-sm text-destructive">パスワードが違います。</p>}
          <Button
            type="submit"
            disabled={loading || !password}
            className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? "確認中…" : "ログイン"}
          </Button>
        </div>
      </form>
    </div>
  );
}
