"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { MobileNavButton } from "@/components/mobile-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PaperPlaneTilt,
  Crown,
  ArrowsLeftRight,
  ClockCounterClockwise,
  QrCode,
  Lightning,
} from "@phosphor-icons/react";

interface PaymentFeature {
  icon: React.ComponentType<{ size?: number; weight?: "regular" | "fill"; className?: string }>;
  title: string;
  description: string;
  comingSoon?: boolean;
}

const paymentFeatures: PaymentFeature[] = [
  {
    icon: PaperPlaneTilt,
    title: "Send Money",
    description: "Transfer funds to any bank account instantly",
    comingSoon: false,
  },
  {
    icon: ArrowsLeftRight,
    title: "Between Accounts",
    description: "Move money between your connected accounts",
    comingSoon: false,
  },
  {
    icon: ClockCounterClockwise,
    title: "Scheduled Payments",
    description: "Set up recurring or future dated transfers",
    comingSoon: true,
  },
  {
    icon: QrCode,
    title: "QR Payments",
    description: "Scan and pay using QR codes",
    comingSoon: true,
  },
  {
    icon: Lightning,
    title: "Quick Pay",
    description: "Save frequent recipients for one-tap payments",
    comingSoon: true,
  },
];

export function PaymentsContent() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="!self-center h-4" />
          <h1 className="font-semibold">Payments</h1>
        </div>
        <MobileNavButton />
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
          {/* Pro Feature Banner */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Crown size={24} weight="fill" className="text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-lg">Upgrade to Pro</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Payment initiation is available on the Pro plan. Send money directly
                    from the app using Tarabut's secure payment infrastructure.
                  </p>
                  <Button className="mt-4" size="sm">
                    Upgrade to Pro - BHD 2.900/month
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Features</CardTitle>
              <CardDescription>
                Everything you need to manage your payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
                  >
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon size={20} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{feature.title}</p>
                        {feature.comingSoon && (
                          <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Recent Payments (Placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Payments</CardTitle>
              <CardDescription>
                Your payment history will appear here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center">
                <PaperPlaneTilt
                  size={48}
                  className="mx-auto text-muted-foreground/50 mb-4"
                />
                <p className="text-muted-foreground text-sm">
                  No payments yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upgrade to Pro to start making payments
                </p>
              </div>
            </CardContent>
          </Card>

          {/* How it Works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How Payments Work</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-sm">Connect your bank</p>
                    <p className="text-xs text-muted-foreground">
                      Link your bank account through secure Open Banking
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-sm">Enter recipient details</p>
                    <p className="text-xs text-muted-foreground">
                      Add the IBAN and amount you want to send
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-sm">Authorize the payment</p>
                    <p className="text-xs text-muted-foreground">
                      Confirm with your bank's authentication
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium shrink-0">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-sm">Payment complete</p>
                    <p className="text-xs text-muted-foreground">
                      Funds are transferred instantly through Tarabut
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
