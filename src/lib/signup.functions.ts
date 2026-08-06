import { createServerFn } from "@tanstack/react-start";

type RegisterInput = { email: string; password: string };

export const registerMember = createServerFn({ method: "POST" })
  .inputValidator((input: RegisterInput) => {
    const email = String(input?.email ?? "").trim().toLowerCase();
    const password = String(input?.password ?? "");
    if (!email || !email.includes("@")) throw new Error("INVALID_EMAIL");
    if (password.length < 8) throw new Error("WEAK_PASSWORD");
    return { email, password };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("id, email, is_active, user_id")
      .eq("email", data.email)
      .maybeSingle();

    if (memberError) {
      return { ok: false as const, code: "SERVER_ERROR" as const };
    }
    if (!member) {
      return { ok: false as const, code: "NOT_ALLOWED" as const };
    }
    if (!member.is_active) {
      return { ok: false as const, code: "INACTIVE" as const };
    }

    // Does an auth account already exist for this email?
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const existing = list?.users?.find(
      (u) => (u.email ?? "").toLowerCase() === data.email,
    );
    if (existing) {
      return { ok: false as const, code: "ALREADY_REGISTERED" as const };
    }

    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });

    if (createError || !created?.user) {
      return { ok: false as const, code: "SERVER_ERROR" as const };
    }

    await supabaseAdmin
      .from("members")
      .update({ user_id: created.user.id })
      .eq("id", member.id);

    return { ok: true as const };
  });
