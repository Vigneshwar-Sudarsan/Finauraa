"use client";

import { useRouter } from "next/navigation";
import { ProfileContent } from "@/components/settings/profile-content";
import { Button } from "@/components/ui/button";
import { CaretLeft } from "@phosphor-icons/react";

export default function ProfilePage() {
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
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto pb-24">
          <ProfileContent />
        </div>
      </div>
    </div>
  );
}
