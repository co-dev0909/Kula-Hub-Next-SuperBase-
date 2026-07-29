"use server";

import { createClient } from "@/lib/supabase/server";

export async function signIn(input: { email: string; password: string }) {
  if (!input.email || !input.password) return { success: false, message: "Email and password are required." };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    if (error || !data.user) return { success: false, message: error?.message || "Invalid credentials." };
    const metadata = data.user.user_metadata || {};
    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName: metadata.first_name || "",
        lastName: metadata.last_name || "",
        fullName: [metadata.first_name, metadata.last_name].filter(Boolean).join(" "),
      },
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Authentication service unavailable." };
  }
}

export async function signUp(input: { email: string; password: string; firstName: string; lastName: string }) {
  const supabase = await createClient();
  const { email, password, firstName, lastName } = input;
  if (password.length < 8) return { success: false, message: "Password must be at least 8 characters long." };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { first_name: firstName, last_name: lastName } },
  });
  if (error || !data.user) return { success: false, message: error?.message || "Registration failed." };
  return {
    success: true,
    hasSession: Boolean(data.session),
    user: { id: data.user.id, email: data.user.email, firstName, lastName, fullName: [firstName, lastName].filter(Boolean).join(" ") },
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
