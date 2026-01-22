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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Eye,
  Wallet,
  Receipt,
  Shield,
  Clock,
  Info,
  SpinnerGap,
  CheckCircle,
  Bank,
} from "@phosphor-icons/react";

interface BankConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isConnecting: boolean;
}

const permissions = [
  {
    id: "read_accounts",
    icon: Eye,
    title: "View Account Details",
    description: "Account names, types, and numbers (masked)",
  },
  {
    id: "read_balances",
    icon: Wallet,
    title: "View Balances",
    description: "Current and available balance for each account",
  },
  {
    id: "read_transactions",
    icon: Receipt,
    title: "View Transactions",
    description: "Transaction history for the last 90 days",
  },
];

export function BankConsentDialog({
  open,
  onOpenChange,
  onConfirm,
  isConnecting,
}: BankConsentDialogProps) {
  const [consentChecked, setConsentChecked] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConsentChecked(false);
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = () => {
    if (consentChecked) {
      onConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bank size={24} className="text-primary" />
            </div>
            <div>
              <DialogTitle>Connect Your Bank</DialogTitle>
              <DialogDescription>
                Review the data access permissions
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Permissions List */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Finauraa will be able to:
            </p>
            {permissions.map((permission) => (
              <div
                key={permission.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="size-8 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                  <permission.icon size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{permission.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {permission.description}
                  </p>
                </div>
                <CheckCircle
                  size={18}
                  weight="fill"
                  className="text-green-500 flex-shrink-0 ml-auto"
                />
              </div>
            ))}
          </div>

          {/* Security & Duration Info */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Shield size={16} className="text-green-600" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Secure connection</strong> via
                Open Banking
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-blue-600" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Valid for 90 days</strong> -
                you can revoke anytime
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Info size={16} className="text-amber-600" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Read-only access</strong> -
                we cannot make payments
              </span>
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
            <Checkbox
              id="consent"
              checked={consentChecked}
              onCheckedChange={(checked) => setConsentChecked(checked === true)}
              disabled={isConnecting}
            />
            <Label
              htmlFor="consent"
              className="text-sm leading-relaxed cursor-pointer"
            >
              I understand and agree to share my bank data with Finauraa for
              personal finance management. I can withdraw this consent at any
              time from Settings.
            </Label>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isConnecting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!consentChecked || isConnecting}
            className="w-full sm:w-auto gap-2"
          >
            {isConnecting ? (
              <>
                <SpinnerGap size={16} className="animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Continue to Bank
              </>
            )}
          </Button>
        </DialogFooter>

        {/* PDPL/BOBF Compliance Note */}
        <p className="text-xs text-center text-muted-foreground pt-2 border-t">
          Protected under Bahrain Personal Data Protection Law (PDPL) and Open
          Banking Framework (BOBF)
        </p>
      </DialogContent>
    </Dialog>
  );
}
