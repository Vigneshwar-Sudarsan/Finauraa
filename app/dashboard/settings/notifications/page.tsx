"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { Button } from "@/components/ui/button";
import { CaretLeft } from "@phosphor-icons/react";

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
      setLoading(false);
    };
    getUser();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <CaretLeft size={16} />
            Back
          </Button>
        </div>
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
      </div>
    );
  }

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
          {userId && <NotificationSettings userId={userId} />}
        </div>
      </div>
    </div>
  );
}
