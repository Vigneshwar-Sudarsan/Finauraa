"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkle, SpinnerGap } from "@phosphor-icons/react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for error from callback
  const urlError = searchParams.get("error");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Redirect to the original page if provided, otherwise go to home
    const redirectUrl = searchParams.get("redirect");
    router.push(redirectUrl ? decodeURIComponent(redirectUrl) : "/");
    router.refresh();
  };

  const displayError = error || urlError;

  return (
    <div className="min-h-dvh flex flex-col bg-background px-4 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/15 rounded-full blur-[128px] translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Spacer for desktop centering, grows on mobile to push content down */}
      <div className="flex-1 md:flex-none" />

      <div className="w-full max-w-sm mx-auto space-y-6 relative z-10 py-8 md:my-auto">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="size-12 rounded-xl bg-foreground flex items-center justify-center shadow-lg">
            <Sparkle size={24} weight="fill" className="text-background" />
          </div>
          <h1 className="text-xl font-semibold">finauraa</h1>
          <p className="text-sm text-muted-foreground">Welcome back</p>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-3">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="h-11"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="h-11"
            />
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {displayError && (
            <p className="text-sm text-destructive">{displayError}</p>
          )}

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? (
              <>
                <SpinnerGap size={16} className="animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        {/* Signup link */}
        <p className="text-center text-sm text-muted-foreground pb-safe">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-foreground font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center">
        <SpinnerGap size={32} className="animate-spin text-muted-foreground" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
