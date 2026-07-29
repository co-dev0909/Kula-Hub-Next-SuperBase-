import { NextResponse } from "next/server";
import { authenticated, unauthorized } from "@/lib/api/auth";

export async function PATCH(request: Request) {
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();

  const { currentPassword, newPassword, confirmPassword } = await request.json();
  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ success: false, message: "Current password, new password, and confirmation are required." }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ success: false, message: "New password and confirmation do not match." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ success: false, message: "New password must be at least 8 characters long." }, { status: 400 });
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email!, password: currentPassword });
  if (verifyError) {
    return NextResponse.json({ success: false, message: "Current password is incorrect." }, { status: 401 });
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  return NextResponse.json({ success: true, message: "Password updated successfully." });
}
