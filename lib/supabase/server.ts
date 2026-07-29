import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function environment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured. Add the hosted project URL and publishable key to .env.local.");
  }
  return { url, key };
}

export async function createClient() {
  const { url, key } = environment();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies. middleware.ts refreshes them.
        }
      },
    },
  });
}
