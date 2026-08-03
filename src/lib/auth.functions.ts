import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Makes sure an account exists for anyone registered in the backend.
 *
 * - If the email does not have an auth user yet, the auth user is created on
 *   first login with the password typed in the form and is auto-confirmed.
 * - If the auth user already exists but the email was never confirmed,
 *   it gets confirmed so password login works.
 * - Existing passwords are never overwritten.
 */
export const ensureAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("email, is_active")
      .ilike("email", email)
      .maybeSingle();

    if (memberError) {
      return { ok: false as const, reason: "error" as const, message: memberError.message };
    }

    if (member && member.is_active === false) {
      return { ok: false as const, reason: "inactive" as const };
    }

    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) {
      return { ok: false as const, reason: "error" as const, message: listError.message };
    }
    const existing = list?.users.find((u) => (u.email ?? "").toLowerCase() === email);

    if (existing) {
      if (!existing.email_confirmed_at) {
        const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          email_confirm: true,
        });
        if (confirmError) {
          return { ok: false as const, reason: "error" as const, message: confirmError.message };
        }
      }
      return { ok: true as const, created: false as const };
    }

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
    });
    if (error) return { ok: false as const, reason: "error" as const, message: error.message };

    return { ok: true as const, created: true as const };
  });
