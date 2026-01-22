"use client";

import { ShieldCheck, Sparkle, Crown, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AIModeIntroProps {
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  disabled?: boolean;
}

export function AIModeIntro({ onAction, disabled }: AIModeIntroProps) {
  return (
    <div className="w-full max-w-md rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/60 bg-muted/30">
        <h3 className="font-semibold text-sm">Choose Your AI Experience</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          How should I help you with your finances?
        </p>
      </div>

      {/* Mode Options */}
      <div className="p-3 space-y-2">
        {/* Privacy-First Mode */}
        <div className="p-3 rounded-lg border border-border bg-background">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} className="text-blue-500" weight="duotone" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Privacy Mode</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">Free</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Your data stays private. I&apos;ll give general guidance without seeing exact amounts.
              </p>
              <div className="mt-2 text-[10px] text-muted-foreground space-y-0.5">
                <p>&quot;Your spending is above average this week&quot;</p>
                <p>&quot;You have a healthy balance&quot;</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced AI Mode */}
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkle size={18} className="text-primary" weight="duotone" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Enhanced AI</span>
                <Badge className="text-[10px] h-4 px-1.5 flex items-center gap-0.5">
                  <Crown size={10} weight="fill" />
                  Pro
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Get specific insights with exact amounts and personalized recommendations.
              </p>
              <div className="mt-2 text-[10px] text-primary/80 space-y-0.5">
                <p>&quot;You spent 287 BHD on groceries this week&quot;</p>
                <p>&quot;You have 75 BHD left in dining budget&quot;</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {disabled ? (
        <div className="p-3 pt-0">
          <p className="text-xs text-muted-foreground text-center">Choice made</p>
        </div>
      ) : (
        <div className="p-3 pt-0 flex flex-col gap-2">
          <Button
            size="sm"
            className="w-full rounded-full gap-2"
            onClick={() => onAction?.("upgrade-for-enhanced-ai")}
          >
            <Crown size={14} weight="fill" />
            Upgrade to Pro
            <ArrowRight size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full rounded-full text-muted-foreground"
            onClick={() => onAction?.("continue-privacy-mode")}
          >
            Continue with Privacy Mode
          </Button>
        </div>
      )}
    </div>
  );
}
