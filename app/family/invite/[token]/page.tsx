"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Check,
  X,
  SpinnerGap,
  Warning,
  Clock,
  ArrowRight,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

interface InvitationData {
  invitation: {
    id: string;
    email: string;
    role: string;
    invited_at: string;
    invitation_expires_at: string;
    group: {
      id: string;
      name: string;
      member_count: number;
    } | null;
    inviter: {
      id: string;
      full_name: string | null;
      email: string | null;
    } | null;
  };
}

export default function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [data, setData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<"accepted" | "declined" | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, [supabase]);

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const response = await fetch(`/api/family/invitations/${token}`);
        const result = await response.json();

        if (response.status === 410) {
          if (result.expired) {
            setExpired(true);
          } else {
            setError(result.error || "This invitation is no longer valid");
          }
          return;
        }

        if (!response.ok) {
          setError(result.error || "Failed to load invitation");
          return;
        }

        setData(result);
      } catch (err) {
        setError("Failed to load invitation");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleResponse = async (action: "accept" | "decline") => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(`/family/invite/${token}`);
      router.push(`/login?redirect=${returnUrl}`);
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/family/invitations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || `Failed to ${action} invitation`);
        return;
      }

      setSuccess(action === "accept" ? "accepted" : "declined");

      if (action === "accept") {
        // Redirect to family settings after a brief delay
        setTimeout(() => {
          router.push("/dashboard/settings/family");
        }, 2000);
      }
    } catch (err) {
      setError(`Failed to ${action} invitation`);
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const getInviterName = () => {
    if (!data?.invitation.inviter) return "Someone";
    return data.invitation.inviter.full_name || data.invitation.inviter.email || "Someone";
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "?";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-4">
          <SpinnerGap size={32} className="animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Clock size={48} className="mx-auto text-amber-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invitation Expired</h2>
            <p className="text-muted-foreground mb-6">
              This invitation has expired. Please ask the group owner to send a new invitation.
            </p>
            <Button asChild>
              <Link href="/">Go to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Warning size={48} className="mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button asChild>
              <Link href="/">Go to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            {success === "accepted" ? (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <Check size={32} className="text-green-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Welcome to the Family!</h2>
                <p className="text-muted-foreground mb-6">
                  You&apos;ve successfully joined {data?.invitation.group?.name || "the family group"}.
                  Redirecting to your dashboard...
                </p>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <SpinnerGap size={16} className="animate-spin" />
                  Redirecting...
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <X size={32} className="text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Invitation Declined</h2>
                <p className="text-muted-foreground mb-6">
                  You&apos;ve declined the invitation. You can always join later if you change your mind.
                </p>
                <Button asChild>
                  <Link href="/">Go to Home</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Users size={32} className="text-primary" />
          </div>
          <CardTitle>Family Group Invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join a family group on Finauraa
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={undefined} />
                <AvatarFallback>
                  {getInitials(
                    data?.invitation.inviter?.full_name || null,
                    data?.invitation.inviter?.email || null
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{getInviterName()}</p>
                <p className="text-sm text-muted-foreground">invited you to join</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-background rounded-lg p-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{data?.invitation.group?.name || "Family Group"}</p>
                <p className="text-sm text-muted-foreground">
                  {data?.invitation.group?.member_count || 0} member
                  {(data?.invitation.group?.member_count || 0) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <p className="text-sm font-medium">As a family member, you&apos;ll get:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <Check size={14} className="text-green-500" />
                Your own private financial dashboard
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-green-500" />
                AI-powered spending insights
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-green-500" />
                Bank account connections
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-green-500" />
                Savings goals tracking
              </li>
            </ul>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <Warning size={16} />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {isAuthenticated === false && (
              <p className="text-sm text-muted-foreground text-center">
                You need to sign in to accept this invitation
              </p>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={() => handleResponse("accept")}
              disabled={processing}
            >
              {processing ? (
                <>
                  <SpinnerGap size={16} className="animate-spin mr-2" />
                  Processing...
                </>
              ) : isAuthenticated === false ? (
                <>
                  Sign In to Accept
                  <ArrowRight size={16} className="ml-2" />
                </>
              ) : (
                <>
                  Accept Invitation
                  <Check size={16} className="ml-2" />
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => handleResponse("decline")}
              disabled={processing}
            >
              Decline
            </Button>
          </div>

          {/* Expiry Notice */}
          {data?.invitation.invitation_expires_at && (
            <p className="text-xs text-muted-foreground text-center">
              This invitation expires on{" "}
              {new Date(data.invitation.invitation_expires_at).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
