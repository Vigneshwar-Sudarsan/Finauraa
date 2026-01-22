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
import { ShieldCheck, Sparkle, Warning } from "@phosphor-icons/react";

interface EnhancedAIConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConsent: () => void;
  onDecline: () => void;
  isPro: boolean;
}

export function EnhancedAIConsentDialog({
  open,
  onOpenChange,
  onConsent,
  onDecline,
  isPro
}: EnhancedAIConsentDialogProps) {
  const [understood, setUnderstood] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const canProceed = understood && agreedToTerms;

  const handleConsent = () => {
    if (canProceed) {
      onConsent();
      // Reset checkboxes
      setUnderstood(false);
      setAgreedToTerms(false);
    }
  };

  const handleDecline = () => {
    onDecline();
    // Reset checkboxes
    setUnderstood(false);
    setAgreedToTerms(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkle className="h-6 w-6 text-primary" weight="duotone" />
            <DialogTitle className="text-2xl">Enable Enhanced AI</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Get personalized financial insights with specific amounts and actionable recommendations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Pro Feature Notice */}
          {!isPro && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Warning className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100 text-sm">
                    Pro Feature Required
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                    Enhanced AI is available exclusively for Pro subscribers ($7.99/month).
                    Upgrade to unlock this feature.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Comparison */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Sparkle className="h-5 w-5 text-primary" weight="fill" />
              See the Difference
            </h3>
            <div className="space-y-3">
              {/* Example 1 */}
              <div className="border rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  You ask: "How much did I spend on groceries?"
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-1">Privacy-First:</p>
                    <p className="text-xs text-muted-foreground">"Check your dashboard for details"</p>
                  </div>
                  <div className="bg-primary/10 rounded p-2">
                    <p className="text-[10px] font-semibold text-primary mb-1">Enhanced AI:</p>
                    <p className="text-xs font-medium">"287.500 BHD last week"</p>
                  </div>
                </div>
              </div>

              {/* Example 2 */}
              <div className="border rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  You ask: "Can I afford 50 BHD on entertainment?"
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-1">Privacy-First:</p>
                    <p className="text-xs text-muted-foreground">"Check your budget page"</p>
                  </div>
                  <div className="bg-primary/10 rounded p-2">
                    <p className="text-[10px] font-semibold text-primary mb-1">Enhanced AI:</p>
                    <p className="text-xs font-medium">"Yes! 75.250 BHD remaining"</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What We Share */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              What Data Gets Shared
            </h3>
            <p className="text-sm text-blue-900 dark:text-blue-100 mb-3">
              When Enhanced AI is enabled, we share the following with Claude AI (by Anthropic):
            </p>
            <ul className="space-y-1.5 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Exact account balances and transaction amounts</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Merchant names and transaction descriptions</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Budget limits and spending details</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Savings goals and progress</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Income and expense patterns</span>
              </li>
            </ul>
          </div>

          {/* Privacy Guarantees */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" weight="fill" />
              Our Privacy Guarantees
            </h3>
            <ul className="space-y-1.5 text-sm text-green-900 dark:text-green-100">
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span><strong>7-Day Retention:</strong> Claude AI stores your data for only 7 days for abuse monitoring, then automatically deletes it</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span><strong>Never Used for Training:</strong> Your data will NOT be used to train AI models (contractually guaranteed by Anthropic)</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span><strong>Encrypted:</strong> All data is encrypted in transit (TLS) and at rest</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span><strong>No Selling:</strong> We never sell your data to third parties</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span><strong>Revocable:</strong> You can switch back to Privacy-First mode anytime</span>
              </li>
            </ul>
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="understood"
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(checked === true)}
              />
              <label
                htmlFor="understood"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                I understand that enabling Enhanced AI will share my exact financial data (amounts, merchants, transactions) with Claude AI for better insights
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                I agree to share this data and have read Anthropic's{" "}
                <a
                  href="https://www.anthropic.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Privacy Policy
                </a>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleDecline}
          >
            Keep Privacy-First Mode
          </Button>
          <Button
            onClick={handleConsent}
            disabled={!canProceed || !isPro}
          >
            <Sparkle className="h-4 w-4 mr-2" weight="fill" />
            Enable Enhanced AI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
