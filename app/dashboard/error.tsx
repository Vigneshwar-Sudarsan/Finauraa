"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { WarningCircle, House } from "@phosphor-icons/react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="h-dvh w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
        <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <WarningCircle size={24} className="text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Dashboard Error</h2>
          <p className="text-sm text-muted-foreground">
            Something went wrong loading this page. Please try again or go back to home.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
          <Button asChild>
            <Link href="/">
              <House size={16} className="mr-2" />
              Go home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
