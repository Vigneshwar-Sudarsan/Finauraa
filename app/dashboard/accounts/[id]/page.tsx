"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CaretLeft } from "@phosphor-icons/react";
import { AccountDetailContent } from "@/components/dashboard/account-detail-content";
import { use } from "react";

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  return (
    <div className="flex flex-col h-dvh">
      {/* Header with Back Button */}
      <div className="p-4 border-b sticky top-0 bg-background z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <CaretLeft size={16} />
          Back to Accounts
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <AccountDetailContent accountId={id} />
      </div>
    </div>
  );
}
