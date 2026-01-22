"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpinnerGap, Warning } from "@phosphor-icons/react";

interface DeleteGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  memberCount: number;
}

export function DeleteGroupDialog({
  open,
  onOpenChange,
  groupName,
  memberCount,
}: DeleteGroupDialogProps) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmation !== groupName) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/family/group", {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to delete group");
        return;
      }

      router.push("/dashboard/settings");
      router.refresh();
    } catch (err) {
      setError("Failed to delete group");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmation("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">Delete Family Group</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                This action cannot be undone. This will permanently delete your family group
                and remove all {memberCount} member{memberCount !== 1 ? "s" : ""}.
              </p>
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-destructive font-medium">
                  <Warning size={16} />
                  Warning
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All members will lose family plan access</li>
                  <li>• Pending invitations will be cancelled</li>
                  <li>• Member data will not be deleted</li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-2">
          <Label htmlFor="confirmation">
            Type <span className="font-mono font-semibold">{groupName}</span> to confirm
          </Label>
          <Input
            id="confirmation"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={groupName}
          />
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive mt-2">
              <Warning size={16} />
              {error}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || confirmation !== groupName}
          >
            {loading ? (
              <>
                <SpinnerGap size={16} className="animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              "Delete Group"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
