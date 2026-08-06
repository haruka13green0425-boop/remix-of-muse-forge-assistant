import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { registerMember } from "@/lib/signup.functions";




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
      const { error: err } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      });

      if (err) {
        console.error("[signInWithPassword] failed", err);
        setError("メールアドレスまたはパスワードが違います");
        return;
      }
    } catch (err) {
      console.error("[signInWithPassword] threw", err);
      setError("メールアドレスまたはパスワードが違います");
    } finally {
      setSending(false);
    }
  };

  const doRegister = useServerFn(registerMember);
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suBusy, setSuBusy] = useState(false);
  const [suError, setSuError] = useState<string | null>(null);
  const [suDone, setSuDone] = useState(false);

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (suBusy) return;
    setSuError(null);
    setSuDone(false);
    if (!suEmail.trim() || suPassword.length < 8) {
      setSuError("メールアドレスと8文字以上のパスワードを入力してください");
      return;
    }
    setSuBusy(true);
    try {
      const res = await doRegister({
        data: { email: suEmail.trim().toLowerCase(), password: suPassword },
      });
      if (!res.ok) {
        setSuError(
          res.code === "NOT_ALLOWED"
            ? "このメールアドレスは登録対象ではありません。ご購入時のメールアドレスをご確認ください。"
            : res.code === "INACTIVE"
              ? "このメールアドレスは現在ご利用いただけません。"
              : res.code === "ALREADY_REGISTERED"
                ? "このメールアドレスは既に登録済みです。上のログインからお進みください。"
                : "登録に失敗しました。もう一度お試しください。",
        );
        return;
      }
      setSuDone(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: suEmail.trim().toLowerCase(),
        password: suPassword,
      });
      if (signInError) {
        setSuError("登録は完了しました。上のログインからお進みください。");
      }
    } catch {
      setSuError("登録に失敗しました。もう一度お試しください。");
    } finally {
      setSuBusy(false);
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

        <section className="mt-12 border-t border-border pt-8">
          <h2 className="text-lg font-semibold text-foreground">はじめて利用する方へ</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            ご購入時のメールアドレスと、ご自身で決めたパスワードを登録してください。登録後はそのパスワードでログインできます。
            ご購入情報にないメールアドレスは登録できません。
          </p>
          <form onSubmit={onRegister} className="mt-6 space-y-4">
            <input
              type="email"
              autoComplete="email"
              value={suEmail}
              onChange={(e) => setSuEmail(e.target.value)}
              placeholder="ご購入時のメールアドレス"
              className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              autoComplete="new-password"
              value={suPassword}
              onChange={(e) => setSuPassword(e.target.value)}
              placeholder="新しいパスワード（8文字以上）"
              className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={suBusy}
              className="w-full rounded-md border border-input bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-60"
            >
              {suBusy ? "登録中…" : "パスワードを登録する"}
            </button>
            {suError && <p className="text-sm text-destructive">{suError}</p>}
            {suDone && !suError && (
              <p className="text-sm text-muted-foreground">登録が完了しました。</p>
            )}
          </form>
        </section>
      </div>

    </main>
  );
}

