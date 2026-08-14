import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const RESEND_COOLDOWN_SECONDS = 60;

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "ログイン — Prompt Atelier 会員ページ" },
      {
        name: "description",
        content:
          "ご登録のメールアドレスにログイン用のリンクを送信します。Prompt Atelier のご購入者様専用ログインページです。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "ログイン — Prompt Atelier 会員ページ" },
      {
        property: "og:description",
        content: "ご登録のメールアドレスにログイン用のリンクを送信します。",
      },
      { name: "twitter:title", content: "ログイン — Prompt Atelier 会員ページ" },
      {
        name: "twitter:description",
        content: "ご登録のメールアドレスにログイン用のリンクを送信します。",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
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

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const sendLoginLink = async () => {
    if (sending || resendCooldown > 0) return;

    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setError("メールアドレスを入力してください");
      return;
    }

    setSending(true);
    setError(null);
    setSent(false);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          shouldCreateUser: false,
        },
      });

      if (otpError) {
        setError("登録されたメールアドレスではありません。サブスク登録をご確認ください。");
        return;
      }

      setEmail(normalized);
      setSent(true);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      console.error("[login link] failed", err);
      setError("登録されたメールアドレスではありません。サブスク登録をご確認ください。");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-md">
        <p className="text-xs tracking-[0.3em] text-muted-foreground">PROMPT ATELIER</p>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">ログイン</h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          ご登録のメールアドレスにログイン用のリンクを送信します。
          <br />
          メール内のボタンからログインしてください。
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendLoginLink();
          }}
          className="mt-8 space-y-4"
        >
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSent(false);
              setError(null);
            }}
            placeholder="you@example.com"
            className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            type="submit"
            disabled={sending || resendCooldown > 0}
            className="h-11 w-full"
          >
            {sending
              ? "送信中…"
              : resendCooldown > 0
                ? `再送信まで ${resendCooldown}秒`
                : sent
                  ? "ログインリンクを再送"
                  : "ログインリンクを送信"}
          </Button>

          <p className="text-xs leading-5 text-muted-foreground">
            メールが届かない場合は、迷惑メールフォルダもご確認ください。
            <br />
            数分経っても届かない場合は、ご登録のメールアドレスにお間違いがないかご確認の上、再度お試しください。
          </p>

          {sent && (
            <p className="text-sm leading-6 text-foreground">
              ログインリンクをメールにお送りしました。メール内のボタンからログインしてください。
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </div>
    </main>
  );
}
