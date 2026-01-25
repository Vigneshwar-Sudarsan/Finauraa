"use client";

import { DashboardHeader } from "./dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PaperPlaneTilt,
  Rocket,
  ArrowsLeftRight,
  ClockCounterClockwise,
  QrCode,
  Lightning,
  Bell,
} from "@phosphor-icons/react";

interface PaymentFeature {
  icon: React.ComponentType<{ size?: number; weight?: "regular" | "fill"; className?: string }>;
  title: string;
  description: string;
}

const paymentFeatures: PaymentFeature[] = [
  {
    icon: PaperPlaneTilt,
    title: "Send Money",
    description: "Transfer funds to any bank account instantly",
  },
  {
    icon: ArrowsLeftRight,
    title: "Between Accounts",
    description: "Move money between your connected accounts",
  },
  {
    icon: ClockCounterClockwise,
    title: "Scheduled Payments",
    description: "Set up recurring or future dated transfers",
  },
  {
    icon: QrCode,
    title: "QR Payments",
    description: "Scan and pay using QR codes",
  },
  {
    icon: Lightning,
    title: "Quick Pay",
    description: "Save frequent recipients for one-tap payments",
  },
];

export function PaymentsContent() {
  return (
    <div className="flex flex-col h-full">
      <DashboardHeader title="Payments" />

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
          {/* Coming Soon Banner */}
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20">
            <CardContent className="py-8">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="size-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Rocket size={32} weight="fill" className="text-amber-600" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-sm font-medium mb-3">
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full size-2 bg-amber-500"></span>
                    </span>
                    Coming Soon
                  </div>
                  <h2 className="font-semibold text-xl">Payment Initiation</h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md">
                    We're working on bringing you secure payment initiation powered by
                    Tarabut Gateway's Open Banking PIS (Payment Initiation Service).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Planned Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Planned Features</CardTitle>
              <CardDescription>
                Payment features we're building for you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 opacity-75"
                  >
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon size={20} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-muted-foreground">{feature.title}</p>
                        <span className="text-[10px] font-medium bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                          Coming Soon
                        </span>
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

          {/* Get Notified */}
          <Card className="border-dashed">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bell size={20} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Want to be notified?</p>
                  <p className="text-xs text-muted-foreground">
                    We'll let you know as soon as payment features are available.
                    Keep an eye on your notifications!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How it Will Work */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How It Will Work</CardTitle>
              <CardDescription>
                Powered by Tarabut Gateway Open Banking PIS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="size-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-sm text-muted-foreground">Connect your bank</p>
                    <p className="text-xs text-muted-foreground">
                      Link your bank account through secure Open Banking
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="size-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-sm text-muted-foreground">Enter recipient details</p>
                    <p className="text-xs text-muted-foreground">
                      Add the IBAN and amount you want to send
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="size-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-sm text-muted-foreground">Authorize the payment</p>
                    <p className="text-xs text-muted-foreground">
                      Confirm with your bank's authentication
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="size-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium shrink-0">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-sm text-muted-foreground">Payment complete</p>
                    <p className="text-xs text-muted-foreground">
                      Funds are transferred securely through Tarabut PIS
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
