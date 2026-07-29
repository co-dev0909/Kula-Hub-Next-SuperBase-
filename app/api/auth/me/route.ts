import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/api/auth";

export async function GET() {
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();

  const { data } = await supabase.from("user_profiles").select("first_name,last_name,role").eq("id", user.id).single();
  const firstName = data?.first_name || user.user_metadata?.first_name || "";
  const lastName = data?.last_name || user.user_metadata?.last_name || "";
  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName,
      lastName,
      fullName: [firstName, lastName].filter(Boolean).join(" "),
      role: data?.role || "user",
    },
  });
}
