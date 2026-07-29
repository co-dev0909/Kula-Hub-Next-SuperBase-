import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return NextResponse.json({ message: error?.message || "Invalid credentials." }, { status: 401 });
    }

    const metadata = data.user.user_metadata || {};
    return NextResponse.json({
      token: "cookie-session",
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName: metadata.first_name || "",
        lastName: metadata.last_name || "",
        fullName: [metadata.first_name, metadata.last_name].filter(Boolean).join(" "),
      },
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Login failed." }, { status: 500 });
  }
}
