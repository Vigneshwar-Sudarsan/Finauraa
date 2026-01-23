"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { PrivacyContent } from "@/components/dashboard/privacy-content";
import { Button } from "@/components/ui/button";
import { CaretLeft } from "@phosphor-icons/react";

function PrivacyLoading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="size-2 bg-foreground/40 rounded-full animate-pulse" />
        <div
          className="size-2 bg-foreground/40 rounded-full animate-pulse"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="size-2 bg-foreground/40 rounded-full animate-pulse"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      {/* Header with Back Button */}
      <div className="p-4 border-b sticky top-0 bg-background z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <CaretLeft size={16} />
          Back to Settings
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <Suspense fallback={<PrivacyLoading />}>
          <PrivacyContent />
        </Suspense>
      </div>
    </div>
  );
}
