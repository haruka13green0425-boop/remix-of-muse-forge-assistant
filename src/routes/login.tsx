import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { ensureAccount } from "@/lib/auth.functions";


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
      let { error: err } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      });

      if (err) {
        // Anyone registered in the backend should be able to sign in:
        // create/confirm the account on the server, then retry once.
        const account = await ensureAccount({ data: { email: normalized, password } });
        if (!account.ok) {
          if (account.reason === "inactive") {
            setError("このメールアドレスの利用は停止されています");
          } else if (account.reason === "unknown") {
            setError("このメールアドレスはバックエンドに登録されていません");
          } else {
            setError(`登録確認エラー: ${account.message}`);
          }
          return;
        }

        try {
          const retry = await supabase.auth.signInWithPassword({
            email: normalized,
            password,
          });
          err = retry.error;
        } catch (retryError) {
          const message = retryError instanceof Error ? retryError.message : String(retryError);
          setError(`ログイン処理エラー: ${message}`);
          return;
        }
      }

      if (err) {
        const status = (err as { status?: number }).status;
        setError(
          err.message === "Invalid login credentials"
            ? "バックエンドに登録したパスワードと一致しません。登録時のパスワードを入力してください"
            : `${status ? status + ": " : ""}${err.message}`,
        );
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[signInWithPassword] threw", err);
      setError(`通信エラー: ${message}`);
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
          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {sending ? "ログイン中…" : "ログイン"}
          </button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </div>
    </main>
  );
}

