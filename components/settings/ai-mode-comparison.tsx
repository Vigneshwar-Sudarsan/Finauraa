"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Sparkle, ChatCircle, Crown } from "@phosphor-icons/react";

interface ComparisonExample {
  question: string;
  privacyFirstResponse: string;
  enhancedResponse: string;
}

const comparisonExamples: ComparisonExample[] = [
  {
    question: "How much did I spend on groceries last week?",
    privacyFirstResponse: "I can see groceries is one of your frequent spending categories this week, but I don't have access to specific amounts. Check your dashboard for exact details.",
    enhancedResponse: "You spent 287.500 BHD on groceries last week across 12 transactions. That's 85 BHD more than your average weekly grocery spending."
  },
  {
    question: "Can I afford to spend 50 BHD on entertainment this weekend?",
    privacyFirstResponse: "Based on your spending patterns, check your entertainment budget on the dashboard to see your remaining balance for this month.",
    enhancedResponse: "Yes! You have 75.250 BHD remaining in your entertainment budget this month. Spending 50 BHD would leave you with 25.250 BHD for the rest of January."
  },
  {
    question: "Am I close to my dining budget?",
    privacyFirstResponse: "Your dining budget is near its limit. Visit the budgets page to see exactly how much you have remaining.",
    enhancedResponse: "You've used 180 out of 200 BHD for dining this month (90%). You have 20 BHD remaining, which means about 6-7 BHD per day until the end of the month."
  },
  {
    question: "What's my account balance?",
    privacyFirstResponse: "Your account balance is at a healthy level. Check your accounts page to see the exact amount across all your connected banks.",
    enhancedResponse: "Your total balance across 3 accounts is 2,450.750 BHD. Your checking account has 1,200 BHD, savings has 1,500 BHD, and credit card shows -249.250 BHD."
  }
];

export function AIModeComparison() {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">See the Difference</h3>
        <p className="text-sm text-muted-foreground">
          Compare how the AI responds in each mode with real examples
        </p>
      </div>

      {comparisonExamples.map((example, index) => (
        <Card key={index} className="p-4 border-2">
          {/* Question */}
          <div className="flex items-start gap-2 mb-4 pb-3 border-b">
            <ChatCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" weight="duotone" />
            <div>
              <p className="text-sm font-medium">You ask:</p>
              <p className="text-sm text-muted-foreground mt-1">"{example.question}"</p>
            </div>
          </div>

          {/* Responses Side by Side */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Privacy-First Response */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" weight="duotone" />
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Privacy-First Mode</span>
                <Badge variant="outline" className="text-[10px] h-5">Default</Badge>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-900 dark:text-blue-100 leading-relaxed">
                  {example.privacyFirstResponse}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                ✓ No exact amounts shared
              </p>
            </div>

            {/* Enhanced AI Response */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Sparkle className="h-4 w-4 text-primary" weight="duotone" />
                <span className="text-xs font-semibold text-primary">Enhanced AI Mode</span>
                <Badge variant="default" className="text-[10px] h-5 flex items-center gap-1">
                  <Crown className="h-3 w-3" weight="fill" />
                  Pro
                </Badge>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <p className="text-xs text-foreground leading-relaxed font-medium">
                  {example.enhancedResponse}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                ✓ Specific insights & actionable advice
              </p>
            </div>
          </div>
        </Card>
      ))}

      {/* Summary Card */}
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="text-center">
          <p className="text-sm font-medium mb-2">
            See the difference? Enhanced AI gives you <span className="text-primary font-bold">specific, actionable insights</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Choose Privacy-First for maximum protection, or Enhanced AI for maximum power
          </p>
        </div>
      </Card>
    </div>
  );
}
