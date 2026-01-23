"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Crown,
  User,
  Clock,
  EnvelopeSimple,
  CalendarBlank,
  Trash,
  SpinnerGap,
  Warning,
} from "@phosphor-icons/react";
import { FamilyMember } from "@/lib/types";

interface MemberDetailsSheetProps {
  member: FamilyMember | null;
  onClose: () => void;
  isOwner: boolean;
  currentUserRole: "owner" | "admin" | "member" | null;
  onUpdate: () => void;
}

export function MemberDetailsSheet({
  member,
  onClose,
  isOwner,
  currentUserRole,
  onUpdate,
}: MemberDetailsSheetProps) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const handleRemove = async () => {
    if (!member) return;

    setRemoving(true);
    setError(null);

    try {
      const response = await fetch(`/api/family/members/${member.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to remove member");
        setRemoving(false);
        return;
      }

      setShowRemoveConfirm(false);
      onUpdate();
      onClose();
    } catch (err) {
      setError("Failed to remove member");
      console.error(err);
      setRemoving(false);
    }
  };

  const getRoleIcon = (memberRole: string) => {
    switch (memberRole) {
      case "owner":
        return <Crown size={16} className="text-amber-500" />;
      default:
        return <User size={16} className="text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Active</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

  // Only the primary user (owner) can remove members
  const canRemove = isOwner && member?.role !== "owner";

  return (
    <>
      <Sheet open={!!member} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Member Details</SheetTitle>
            <SheetDescription>
              View and manage this family member
            </SheetDescription>
          </SheetHeader>

          {member && (
            <div className="px-4 pb-4 space-y-6">
              {/* Member Profile */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {member.status === "pending" ? (
                    <AvatarFallback className="bg-muted">
                      <Clock size={24} className="text-muted-foreground" />
                    </AvatarFallback>
                  ) : (
                    <>
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {getInitials(member.profile?.full_name || null, member.email)}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      {member.profile?.full_name || member.email}
                    </h3>
                    {getRoleIcon(member.role)}
                  </div>
                  {getStatusBadge(member.status)}
                </div>
              </div>

              <Separator />

              {/* Member Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <EnvelopeSimple size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm">{member.email}</p>
                  </div>
                </div>

                {member.status === "active" && member.joined_at && (
                  <div className="flex items-center gap-3">
                    <CalendarBlank size={16} className="text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Joined</p>
                      <p className="text-sm">
                        {new Date(member.joined_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {member.status === "pending" && member.invitation_expires_at && (
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Invitation Expires</p>
                      <p className="text-sm">
                        {new Date(member.invitation_expires_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  <Warning size={16} />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Remove Member */}
          {canRemove && member && (
            <SheetFooter className="border-t">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowRemoveConfirm(true)}
              >
                <Trash size={16} className="mr-2" />
                {member.status === "pending" ? "Cancel Invitation" : "Remove Member"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Remove Confirmation */}
      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {member?.status === "pending" ? "Cancel Invitation" : "Remove Member"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {member?.status === "pending" ? (
                <>
                  Are you sure you want to cancel the invitation to{" "}
                  <strong>{member?.email}</strong>?
                </>
              ) : (
                <>
                  Are you sure you want to remove{" "}
                  <strong>{member?.profile?.full_name || member?.email}</strong> from the
                  family group? They will lose access to family plan benefits.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRemoveConfirm(false)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removing}>
              {removing ? (
                <>
                  <SpinnerGap size={16} className="animate-spin mr-2" />
                  {member?.status === "pending" ? "Cancelling..." : "Removing..."}
                </>
              ) : member?.status === "pending" ? (
                "Cancel Invitation"
              ) : (
                "Remove Member"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
