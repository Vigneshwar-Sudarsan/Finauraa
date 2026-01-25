import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  // Support both "next" and "redirect" parameters
  const next = searchParams.get("next") ?? searchParams.get("redirect") ?? "/";

  // Handle OAuth errors (e.g., user denied access)
  if (error) {
    const errorMessage = errorDescription || error;
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorMessage)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
    if (!authError) {
      // Decode the redirect URL if it was encoded
      const redirectPath = decodeURIComponent(next);
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
