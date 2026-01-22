"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { SpinnerGap, Warning } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

interface LeaveGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
}

export function LeaveGroupDialog({
  open,
  onOpenChange,
  groupName,
}: LeaveGroupDialogProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemberId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from("family_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (member) {
        setMemberId(member.id);
      }
    };

    if (open) {
      fetchMemberId();
    }
  }, [open, supabase]);

  const handleLeave = async () => {
    if (!memberId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/family/members/${memberId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to leave group");
        return;
      }

      router.push("/dashboard/settings");
      router.refresh();
    } catch (err) {
      setError("Failed to leave group");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave Family Group</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to leave <strong>{groupName}</strong>?
              </p>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-600 font-medium">
                  <Warning size={16} />
                  What happens when you leave
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• You&apos;ll lose family plan benefits</li>
                  <li>• Your account will be downgraded to free</li>
                  <li>• Your personal data will remain intact</li>
                  <li>• You can join another group or upgrade later</li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
            <Warning size={16} />
            {error}
          </div>
        )}

        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleLeave}
            disabled={loading || !memberId}
          >
            {loading ? (
              <>
                <SpinnerGap size={16} className="animate-spin mr-2" />
                Leaving...
              </>
            ) : (
              "Leave Group"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
