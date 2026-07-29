import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { email, password, firstName = "", lastName = "" } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters long." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });
    if (error || !data.user) {
      return NextResponse.json({ message: error?.message || "Registration failed." }, { status: 400 });
    }

    return NextResponse.json({
      token: data.session ? "cookie-session" : null,
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName,
        lastName,
        fullName: [firstName, lastName].filter(Boolean).join(" "),
      },
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Registration failed." }, { status: 500 });
  }
}
