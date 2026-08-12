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
          "ご登録のメールアドレスに6桁のログインコードを送信します。Prompt Atelier のご購入者様専用ログインページです。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "ログイン — Prompt Atelier 会員ページ" },
      {
        property: "og:description",
        content: "ご登録のメールアドレスに6桁のログインコードを送信します。",
      },
      { name: "twitter:title", content: "ログイン — Prompt Atelier 会員ページ" },
      {
        name: "twitter:description",
        content: "ご登録のメールアドレスに6桁のログインコードを送信します。",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
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

  const sendCode = async () => {
    if (sending || (step === "otp" && resendCooldown > 0)) return;

    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setError("メールアドレスを入力してください");
      return;
    }

    setSending(true);
    setError(null);

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
      setToken("");
      setStep("otp");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      console.error("[email OTP] failed", err);
      setError("登録されたメールアドレスではありません。サブスク登録をご確認ください。");
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifying) return;

    const normalized = email.trim().toLowerCase();
    if (!/^\d{6}$/.test(token)) {
      setError("6桁のコードを入力してください");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: normalized,
        token,
        type: "email",
      });

      if (verifyError) {
        setError("コードが正しくないか、有効期限が切れています。もう一度お試しください。");
        return;
      }

      navigate({ to: "/", replace: true });
    } catch (err) {
      console.error("[email OTP verification] failed", err);
      setError("コードが正しくないか、有効期限が切れています。もう一度お試しください。");
    } finally {
      setVerifying(false);
    }
  };

  const backToEmail = () => {
    setStep("email");
    setToken("");
    setError(null);
    setResendCooldown(0);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-md">
        <p className="text-xs tracking-[0.3em] text-muted-foreground">PROMPT ATELIER</p>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">ログイン</h1>

        {step === "email" ? (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              ご登録のメールアドレスに6桁のログインコードを送信します
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendCode();
              }}
              className="mt-8 space-y-4"
            >
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              <Button type="submit" disabled={sending} className="h-11 w-full">
                {sending ? "送信中…" : "コードを送信"}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </form>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              メールに届いた6桁のコードを入力してください
            </p>
            <p className="mt-2 truncate text-sm text-foreground">{email}</p>

            <form onSubmit={verifyCode} className="mt-8 space-y-4">
              <input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6桁のコード"
                aria-label="6桁のコード"
                className="w-full rounded-md border border-input bg-background px-4 py-3 text-center text-lg tracking-[0.4em] text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                type="submit"
                disabled={verifying || token.length !== 6}
                className="h-11 w-full"
              >
                {verifying ? "ログイン中…" : "ログイン"}
              </Button>

              <div className="flex items-center justify-between gap-4 text-xs">
                <button
                  type="button"
                  onClick={() => void sendCode()}
                  disabled={sending || resendCooldown > 0}
                  className="text-muted-foreground underline underline-offset-4 disabled:no-underline disabled:opacity-50"
                >
                  {resendCooldown > 0
                    ? `${resendCooldown}秒後に再送できます`
                    : "コードを再送"}
                </button>
                <button
                  type="button"
                  onClick={backToEmail}
                  className="text-muted-foreground underline underline-offset-4"
                >
                  メールアドレスを変更
                </button>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </form>
          </>
        )}
      </div>
    </main>
  );
}
