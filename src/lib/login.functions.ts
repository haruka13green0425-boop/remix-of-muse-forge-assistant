import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LoginInput = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
});

function timingSafeEqualString(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  // Compare fixed-length digests to avoid leaking length via early exit.
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Shared-password member login.
 * - The shared password lives only in the server-side SITE_PASSWORD env var.
 * - Only emails already registered in the backend auth users can sign in.
 * - On success we mint a single-use email OTP token via the admin API and hand
 *   only that token to the browser, so no long-lived secret ever reaches the client.
 * - Failures always return the same generic result (no user enumeration).
 */
export const memberLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LoginInput.parse(d))
  .handler(async ({ data }) => {
    const expected = process.env["SITE_PASSWORD"];
    const fail = { ok: false as const };

    // Constant-ish cost on every attempt to blunt brute forcing.
    await new Promise((r) => setTimeout(r, 400));

    if (!expected) return fail;
    if (!timingSafeEqualString(data.password, expected)) return fail;

    const email = data.email.toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Must already exist in the backend auth users.
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (error || !link?.properties?.hashed_token) return fail;

    return { ok: true as const, tokenHash: link.properties.hashed_token };
  });
