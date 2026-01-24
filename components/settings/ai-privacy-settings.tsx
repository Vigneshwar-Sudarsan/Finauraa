"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FeatureBadge } from "@/components/ui/tier-badge";
import { EnhancedAIConsentDialog } from "./enhanced-ai-consent-dialog";
import { AIModeComparison } from "./ai-mode-comparison";
import { ShieldCheck, Sparkle, Info, Crown, Lock } from "@phosphor-icons/react";
import { Switch } from "@/components/ui/switch";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useAIMode } from "@/hooks/use-ai-mode";

export function AIPrivacySettings() {
  const router = useRouter();
  const { canAccess, tier, isLoading: featureLoading } = useFeatureAccess();
  const { mode, hasConsent, isLoading: loading, mutate } = useAIMode();

  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Check if user can access enhanced AI based on subscription
  const canUseEnhancedAI = canAccess("enhancedAI");

  const handleModeToggle = async () => {
    const newMode = mode === 'privacy-first' ? 'enhanced' : 'privacy-first';

    // If switching to enhanced, check subscription first
    if (newMode === 'enhanced') {
      if (!canUseEnhancedAI) {
        // Redirect to upgrade page
        router.push("/dashboard/settings/subscription/plans");
        return;
      }
      setShowConsentDialog(true);
      return;
    }

    // Switching back to privacy-first doesn't need consent
    await updateMode(newMode, false);
  };

  const updateMode = async (newMode: 'privacy-first' | 'enhanced', consentGiven: boolean) => {
    setUpdating(true);
    try {
      const response = await fetch('/api/user/ai-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode, consentGiven })
      });

      const data = await response.json();

      if (response.ok) {
        // Revalidate the cache with new data
        mutate();
        // Show success message
        toast.success(data.message);
      } else {
        // Show error
        toast.error(data.error || 'Failed to update AI mode');
      }
    } catch (error) {
      console.error('Error updating AI mode:', error);
      toast.error('An error occurred while updating your AI settings');
    } finally {
      setUpdating(false);
    }
  };

  const handleConsent = () => {
    setShowConsentDialog(false);
    updateMode('enhanced', true);
  };

  const handleDecline = () => {
    setShowConsentDialog(false);
  };

  if (loading) {
    return (
      <>
        {/* Main Settings Card Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Skeleton className="size-5 rounded" />
                  <Skeleton className="h-6 w-40" />
                </div>
                <Skeleton className="h-4 w-72 mt-2" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mode Options Skeleton */}
            <div className="space-y-4">
              {/* Privacy-First Mode Skeleton */}
              <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="size-5 rounded" />
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full max-w-md mb-3" />
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-36" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced AI Mode Skeleton */}
              <div className="p-4 rounded-lg border-2 border-border bg-muted/20">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="size-5 rounded" />
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-4 w-full max-w-lg mb-3" />
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-36" />
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Toggle Section Skeleton */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>

            {/* Info Box Skeleton */}
            <div className="rounded-lg p-4 border bg-muted/30">
              <div className="flex items-start gap-3">
                <Skeleton className="size-5 rounded shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full max-w-sm" />
                  <Skeleton className="h-3 w-full max-w-md" />
                  <Skeleton className="h-3 w-full max-w-xs" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Card Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="h-4 w-72 mt-1" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-lg border p-4 space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" weight="duotone" />
                AI Privacy Settings
              </CardTitle>
              <CardDescription className="mt-1.5">
                Choose how much financial data you want to share with our AI assistant
              </CardDescription>
            </div>
            {mode === 'enhanced' && (
              <Badge variant="default" className="flex items-center gap-1">
                <Sparkle className="h-3 w-3" weight="fill" />
                Enhanced AI Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode Selector */}
          <div className="space-y-4">
            {/* Privacy-First Mode */}
            <div className={`p-4 rounded-lg border-2 transition-colors ${
              mode === 'privacy-first'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-muted/20'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="h-5 w-5 text-primary" weight="duotone" />
                    <h3 className="font-semibold">Privacy-First Mode</h3>
                    <Badge variant="outline" className="text-xs">Default</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your financial data is anonymized before being sent to AI. The AI sees patterns like "balance is healthy" or "spending is above average" but never exact amounts.
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>✓ Maximum privacy protection</p>
                    <p>✓ No exact amounts shared</p>
                    <p>✓ General financial insights</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced AI Mode */}
            <div className={`p-4 rounded-lg border-2 transition-colors ${
              mode === 'enhanced'
                ? 'border-primary bg-primary/5'
                : !canUseEnhancedAI
                  ? 'border-border bg-muted/30 opacity-75'
                  : 'border-border bg-muted/20'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkle className="h-5 w-5 text-primary" weight="duotone" />
                    <h3 className="font-semibold">Enhanced AI Mode</h3>
                    <FeatureBadge showIcon size="sm" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Share exact financial data with AI for specific insights like "You spent 287.500 BHD on groceries" and personalized recommendations. Requires explicit consent.
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>✓ Specific amount tracking</p>
                    <p>✓ Merchant-level analysis</p>
                    <p>✓ Precise budget coaching</p>
                    <p>✓ Cash flow predictions</p>
                  </div>
                  {!canUseEnhancedAI && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => router.push("/dashboard/settings/subscription/plans")}
                    >
                      <Crown className="h-4 w-4 mr-2" weight="fill" />
                      Upgrade to Pro
                    </Button>
                  )}
                  {mode === 'enhanced' && hasConsent && canUseEnhancedAI && (
                    <div className="mt-3 text-xs text-muted-foreground flex items-start gap-2">
                      <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>You consented to share full data. Data is stored for 7 days by Anthropic, never used for training.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex-1">
              <Label htmlFor="ai-mode" className="text-base font-semibold">
                {mode === 'enhanced' ? 'Enhanced AI Enabled' : 'Privacy-First Mode Active'}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === 'enhanced'
                  ? 'AI has access to exact amounts and transaction details'
                  : 'AI receives only anonymized, aggregated data'}
              </p>
            </div>
            <Switch
              id="ai-mode"
              checked={mode === 'enhanced'}
              onCheckedChange={handleModeToggle}
              disabled={updating}
            />
          </div>

          {/* Additional Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">How we protect your data:</p>
                <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                  <li>• All data encrypted in transit and at rest</li>
                  <li>• Claude AI stores data for 7 days only (abuse monitoring)</li>
                  <li>• Your data never used to train AI models</li>
                  <li>• You can switch modes anytime</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkle className="h-5 w-5" weight="duotone" />
            Compare AI Responses
          </CardTitle>
          <CardDescription>
            See real examples of how each mode responds to your questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AIModeComparison />
        </CardContent>
      </Card>

      {/* Consent Dialog */}
      <EnhancedAIConsentDialog
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
        onConsent={handleConsent}
        onDecline={handleDecline}
        isPro={canUseEnhancedAI}
      />
    </>
  );
}
