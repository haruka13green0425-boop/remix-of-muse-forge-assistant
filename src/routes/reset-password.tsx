import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "パスワード再設定 — Prompt Atelier" },
      { name: "description", content: "Prompt Atelierのログインパスワードを再設定します。" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "パスワード再設定 — Prompt Atelier" },
      { property: "og:description", content: "Prompt Atelierのログインパスワードを再設定します。" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hasRecoveryHash = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    if (hasRecoveryHash) setReady(true);

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("8文字以上の新しいパスワードを入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(`パスワードを変更できませんでした（${updateError.message}）`);
        return;
      }
      await navigate({ to: "/", replace: true });
    } catch (updateError) {
      console.error("[updateUser password] threw", updateError);
      setError("パスワードを変更できませんでした。再設定メールをもう一度送信してください。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-md">
        <p className="text-xs tracking-[0.3em] text-muted-foreground">PROMPT ATELIER</p>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">新しいパスワードを設定</h1>
        {ready ? (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="新しいパスワード（8文字以上）"
              className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" disabled={saving} className="h-11 w-full">
              {saving ? "変更中…" : "パスワードを変更"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        ) : (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-destructive">再設定リンクが無効または期限切れです。</p>
            <Button type="button" variant="outline" className="w-full" onClick={() => navigate({ to: "/login" })}>
              ログイン画面に戻る
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}