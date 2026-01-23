"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SpinnerGap,
  ShieldCheck,
  ChartPieSlice,
  Eye,
  EyeSlash,
  Users,
} from "@phosphor-icons/react";

interface FamilySpendingConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConsent: () => Promise<void>;
  familyGroupName?: string;
}

export function FamilySpendingConsentDialog({
  open,
  onOpenChange,
  onConsent,
  familyGroupName = "your family",
}: FamilySpendingConsentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConsent = async () => {
    if (!hasAgreed) {
      setError("Please agree to the terms to continue");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConsent();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save consent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setHasAgreed(false);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users size={24} className="text-primary" weight="duotone" />
          </div>
          <DialogTitle className="text-center">Family Spending Consent</DialogTitle>
          <DialogDescription className="text-center">
            To use shared spending limits with {familyGroupName}, your category spending totals will be visible to family members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* What's shared */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Eye size={16} className="text-muted-foreground" />
              What family members can see:
            </h4>
            <ul className="space-y-2 ml-6 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <ChartPieSlice size={16} className="mt-0.5 text-emerald-500 shrink-0" />
                <span>Category spending totals (e.g., "Groceries: BHD 150")</span>
              </li>
              <li className="flex items-start gap-2">
                <ChartPieSlice size={16} className="mt-0.5 text-emerald-500 shrink-0" />
                <span>Your contribution percentage to shared limits</span>
              </li>
            </ul>
          </div>

          {/* What's private */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <EyeSlash size={16} className="text-muted-foreground" />
              What stays private:
            </h4>
            <ul className="space-y-2 ml-6 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <ShieldCheck size={16} className="mt-0.5 text-primary shrink-0" />
                <span>Individual transaction details</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck size={16} className="mt-0.5 text-primary shrink-0" />
                <span>Merchant names and locations</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck size={16} className="mt-0.5 text-primary shrink-0" />
                <span>Personal spending limits and goals</span>
              </li>
            </ul>
          </div>

          {/* Consent checkbox */}
          <div className="flex items-start gap-3 pt-4 border-t">
            <Checkbox
              id="consent"
              checked={hasAgreed}
              onCheckedChange={(checked) => setHasAgreed(checked === true)}
            />
            <label
              htmlFor="consent"
              className="text-sm leading-relaxed cursor-pointer"
            >
              I understand and agree to share my category spending totals with my family group members.
            </label>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConsent}
            disabled={isSubmitting || !hasAgreed}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <SpinnerGap size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              "I Agree & Continue"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
