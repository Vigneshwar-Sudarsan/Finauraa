"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SpinnerGap, Warning, Crown } from "@phosphor-icons/react";
import { FamilyMember } from "@/lib/types";

interface TransferOwnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: FamilyMember[];
  onSuccess: () => void;
}

export function TransferOwnershipDialog({
  open,
  onOpenChange,
  members,
  onSuccess,
}: TransferOwnershipDialogProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTransfer = async () => {
    if (!selectedMemberId || !confirmed) return;

    const selectedMember = members.find(m => m.user_id === selectedMemberId);
    if (!selectedMember?.user_id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/family/group/transfer-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_owner_id: selectedMember.user_id,
          confirm: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to transfer ownership");
        return;
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError("Failed to transfer ownership");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedMemberId("");
    setConfirmed(false);
    setError(null);
    onOpenChange(false);
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

  const eligibleMembers = members.filter(m => m.user_id && m.status === "active");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown size={20} className="text-amber-500" />
            Transfer Ownership
          </DialogTitle>
          <DialogDescription>
            Transfer ownership of the family group to another member. You will become an admin.
          </DialogDescription>
        </DialogHeader>

        {eligibleMembers.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              There are no other active members to transfer ownership to.
            </p>
          </div>
        ) : (
          <>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>Select New Owner</Label>
                <RadioGroup value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  {eligibleMembers.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <RadioGroupItem value={member.user_id || ""} />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(member.profile?.full_name || null, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {member.profile?.full_name || member.email}
                        </p>
                        {member.profile?.full_name && (
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {selectedMemberId && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="confirm"
                    checked={confirmed}
                    onCheckedChange={(checked) => setConfirmed(checked === true)}
                  />
                  <label htmlFor="confirm" className="text-sm text-muted-foreground cursor-pointer">
                    I understand that this action cannot be undone. The new owner will have full
                    control over the family group.
                  </label>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  <Warning size={16} />
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={loading || !selectedMemberId || !confirmed}
              >
                {loading ? (
                  <>
                    <SpinnerGap size={16} className="animate-spin mr-2" />
                    Transferring...
                  </>
                ) : (
                  "Transfer Ownership"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
