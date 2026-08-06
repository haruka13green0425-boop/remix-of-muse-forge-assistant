import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { memberLogin } from "@/lib/login.functions";



export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "ログイン — Prompt Atelier 会員ページ" },
      {
        name: "description",
        content:
          "ご登録のメールアドレスとパスワードでログインしてください。Prompt Atelier のご購入者様専用ログインページです。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "ログイン — Prompt Atelier 会員ページ" },
      {
        property: "og:description",
        content: "ご登録のメールアドレスとパスワードでログインしてください。",
      },
      { name: "twitter:title", content: "ログイン — Prompt Atelier 会員ページ" },
      {
        name: "twitter:description",
        content: "ご登録のメールアドレスとパスワードでログインしてください。",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const login = useServerFn(memberLogin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: "/", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        navigate({ to: "/", replace: true });
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    if (!email.trim() || !password) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }
    setSending(true);
    setError(null);
    const normalized = email.trim().toLowerCase();
    try {
      const result = await login({ data: { email: normalized, password } });
      if (!result.ok) {
        setError("メールアドレスまたはパスワードが違います");
        return;
      }
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: "email",
        token_hash: result.tokenHash,
      });
      if (verifyError) {
        setError("メールアドレスまたはパスワードが違います");
        return;
      }
      navigate({ to: "/", replace: true });
    } catch (err) {
      console.error("[memberLogin] failed", err);
      setError("メールアドレスまたはパスワードが違います");
    } finally {
      setSending(false);
    }
  };





  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-md">
        <p className="text-xs tracking-[0.3em] text-muted-foreground">PROMPT ATELIER</p>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">ログイン</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          ご登録のメールアドレスとパスワードを入力してください
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            type="submit"
            disabled={sending}
            className="h-11 w-full"
          >
            {sending ? "ログイン中…" : "ログイン"}
          </Button>
          <Button
            type="button"
            variant="link"
            disabled={resetting}
            onClick={resetPassword}
            className="h-auto w-full whitespace-normal py-1"
          >
            {resetting ? "送信中…" : "ログインできない場合はパスワードを再設定"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {notice && <p className="text-sm text-foreground">{notice}</p>}
        </form>
      </div>
    </main>
  );
}

