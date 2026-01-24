"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkle, SpinnerGap, CheckCircle, Warning } from "@phosphor-icons/react";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if we have a valid session from the reset password email
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      // If there's a code in the URL, exchange it for a session
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setIsValidSession(false);
          return;
        }
        setIsValidSession(true);
        return;
      }

      // Check if user already has a valid session from the reset flow
      if (session) {
        setIsValidSession(true);
      } else {
        setIsValidSession(false);
      }
    };

    checkSession();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <SpinnerGap size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Invalid or expired link
  if (!isValidSession) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background px-4 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-[128px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/15 rounded-full blur-[128px] translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="w-full max-w-sm space-y-6 text-center relative z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="size-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <Warning size={24} weight="fill" className="text-red-500" />
            </div>
            <h1 className="text-xl font-semibold">Invalid or expired link</h1>
            <p className="text-sm text-muted-foreground">
              This password reset link has expired or is invalid. Please request a new one.
            </p>
          </div>
          <Button className="w-full h-11" asChild>
            <Link href="/forgot-password">
              Request new link
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background px-4 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-[128px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/15 rounded-full blur-[128px] translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="w-full max-w-sm space-y-6 text-center relative z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="size-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle size={24} weight="fill" className="text-green-500" />
            </div>
            <h1 className="text-xl font-semibold">Password updated</h1>
            <p className="text-sm text-muted-foreground">
              Your password has been successfully updated. You can now sign in with your new password.
            </p>
          </div>
          <Button className="w-full h-11" onClick={() => router.push("/login")}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/15 rounded-full blur-[128px] translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="w-full max-w-sm space-y-6 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="size-12 rounded-xl bg-foreground flex items-center justify-center shadow-lg">
            <Sparkle size={24} weight="fill" className="text-background" />
          </div>
          <h1 className="text-xl font-semibold">finauraa</h1>
          <p className="text-sm text-muted-foreground">Create new password</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="new-password"
              className="h-11"
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="new-password"
              className="h-11"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? (
              <>
                <SpinnerGap size={16} className="animate-spin" />
                Updating password...
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center">
        <SpinnerGap size={32} className="animate-spin text-muted-foreground" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
