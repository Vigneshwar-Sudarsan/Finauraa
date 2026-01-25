"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkle, SpinnerGap, CheckCircle, ArrowLeft } from "@phosphor-icons/react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-dvh flex flex-col bg-background px-4 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-[128px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/15 rounded-full blur-[128px] translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Spacer for desktop centering, grows on mobile to push content down */}
        <div className="flex-1 md:flex-none" />

        <div className="w-full max-w-sm mx-auto space-y-6 text-center relative z-10 py-8 md:my-auto">
          <div className="flex flex-col items-center gap-4">
            <div className="size-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle size={24} weight="fill" className="text-green-500" />
            </div>
            <h1 className="text-xl font-semibold">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We&apos;ve sent a password reset link to <strong>{email}</strong>.
              Click the link to reset your password.
            </p>
          </div>
          <Button variant="outline" className="w-full h-11 pb-safe" asChild>
            <Link href="/login">
              <ArrowLeft size={16} className="mr-2" />
              Back to login
            </Link>
          </Button>
        </div>
      </div>
    );
  }

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
          <p className="text-sm text-muted-foreground">Reset your password</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
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
                Sending link...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>

        {/* Back to login */}
        <p className="text-center text-sm text-muted-foreground pb-safe">
          Remember your password?{" "}
          <Link href="/login" className="text-foreground font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
