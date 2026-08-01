import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const PURCHASE_URL = "https://square.link/u/vXp5kUSI";

type State =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "denied" }
  | { status: "allowed"; email: string };

export function MemberGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>({ status: "loading" });

  const check = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email?.toLowerCase() ?? null;
    if (!email) {
      setState({ status: "anonymous" });
      return;
    }
    const { data: member } = await supabase
      .from("members")
      .select("is_active")
      .eq("is_active", true)
      .maybeSingle();
    setState(member ? { status: "allowed", email } : { status: "denied" });
  }, []);

  useEffect(() => {
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void check();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [check]);

  useEffect(() => {
    if (state.status === "anonymous") navigate({ to: "/login", replace: true });
  }, [state.status, navigate]);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  if (state.status === "loading" || state.status === "anonymous") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  if (state.status === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
        <div className="w-full max-w-md text-center">
          <h1 className="text-xl font-semibold text-foreground">
            ご購入者様のみご利用いただけます
          </h1>
          <a
            href={PURCHASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            購入ページへ
          </a>
          <div className="mt-6">
            <button
              onClick={signOut}
              className="text-xs text-muted-foreground underline underline-offset-4"
            >
              ログアウト
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="flex items-center justify-end gap-3 border-b border-border px-5 py-3">
        <span className="truncate text-xs text-muted-foreground">{state.email}</span>
        <button
          onClick={signOut}
          className="rounded-md border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          ログアウト
        </button>
      </header>
      {children}
    </>
  );
}
