"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { SpinnerGap, Clock, User, Trophy, Flag, Target } from "@phosphor-icons/react";
import { cn, formatCurrency } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface HistoryEntry {
  id: string;
  amount: number;
  currency: string;
  note: string | null;
  created_at: string;
  contributor: {
    id: string;
    name: string;
  };
  recorded_by: {
    id: string;
    name: string;
  } | null;
}

interface GoalInfo {
  id: string;
  name: string;
  target_amount: number;
  currency: string;
  created_at: string;
  created_by: {
    id: string;
    name: string;
  };
}

interface ContributionHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string | null;
  goalName: string;
  isFamily?: boolean;
}

export function ContributionHistorySheet({
  open,
  onOpenChange,
  goalId,
  goalName,
  isFamily = false,
}: ContributionHistorySheetProps) {
  const isMobile = useIsMobile();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [goalInfo, setGoalInfo] = useState<GoalInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && goalId) {
      fetchHistory();
    }
  }, [open, goalId]);

  const fetchHistory = async () => {
    if (!goalId) return;

    setIsLoading(true);
    setError(null);

    try {
      const baseUrl = isFamily
        ? `/api/finance/family/savings-goals/${goalId}/history`
        : `/api/finance/savings-goals/${goalId}/history`;

      const response = await fetch(baseUrl);

      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      const data = await response.json();
      setHistory(data.history || []);
      setGoalInfo(data.goal || null);
    } catch (err) {
      console.error("Failed to fetch contribution history:", err);
      setError("Unable to load contribution history");
    } finally {
      setIsLoading(false);
    }
  };

  // Group history by date
  const groupedHistory = history.reduce((groups, entry) => {
    const date = new Date(entry.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {} as Record<string, HistoryEntry[]>);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerContent className={isMobile ? "max-h-[85svh] flex flex-col" : "h-full w-full max-w-md flex flex-col"}>
        {/* Header */}
        <div className="border-b shrink-0">
          <DrawerHeader className={`pb-4 pt-4 ${!isMobile ? "text-left" : ""}`}>
            <DrawerTitle className={isMobile ? "text-center text-xl" : "text-xl"}>
              Contribution History
            </DrawerTitle>
            <DrawerDescription className={`${isMobile ? "text-center" : ""} text-muted-foreground`}>
              {goalName}
            </DrawerDescription>
          </DrawerHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <SpinnerGap size={32} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock size={32} className="text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}

          {!isLoading && !error && history.length === 0 && goalInfo && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock size={32} className="text-muted-foreground mb-2" />
                <p className="font-medium">No contributions yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Contributions will appear here as they&apos;re made
                </p>
              </div>

              {/* Goal Creation Event */}
              <div className="pt-4 border-t">
                <div className="sticky top-0 bg-background pb-2 pt-1 z-10">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {new Date(goalInfo.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>
                </div>
                <div className="relative">
                  <div className="relative flex gap-4 pl-0">
                    <div className="relative z-10 flex-shrink-0 size-8 rounded-full flex items-center justify-center bg-blue-500 text-white">
                      <Flag size={14} weight="fill" />
                    </div>
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">Goal Created</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            by {goalInfo.created_by.name}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-sm text-blue-600 dark:text-blue-500 flex items-center gap-1">
                            <Target size={12} />
                            {formatCurrency(goalInfo.target_amount, goalInfo.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(goalInfo.created_at).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && history.length === 0 && !goalInfo && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock size={32} className="text-muted-foreground mb-2" />
              <p className="font-medium">No contributions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Contributions will appear here as they&apos;re made
              </p>
            </div>
          )}

          {!isLoading && !error && history.length > 0 && (
            <div className="space-y-6">
              {Object.entries(groupedHistory).map(([date, entries]) => (
                <div key={date}>
                  {/* Date Header */}
                  <div className="sticky top-0 bg-background pb-2 pt-1 z-10">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {date}
                    </h3>
                  </div>

                  {/* Timeline */}
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

                    {/* Entries */}
                    <div className="space-y-4">
                      {entries.map((entry, idx) => {
                        const isFirst = idx === 0;
                        const time = new Date(entry.created_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        });

                        return (
                          <div key={entry.id} className="relative flex gap-4 pl-0">
                            {/* Timeline dot */}
                            <div
                              className={cn(
                                "relative z-10 flex-shrink-0 size-8 rounded-full flex items-center justify-center",
                                isFirst
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {isFirst ? (
                                <Trophy size={14} weight="fill" />
                              ) : (
                                <User size={14} />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium text-sm">
                                    {entry.contributor.name}
                                  </p>
                                  {entry.recorded_by && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <span>recorded by</span>
                                      <span className="font-medium">{entry.recorded_by.name}</span>
                                    </p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-500">
                                    +{formatCurrency(entry.amount, entry.currency)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{time}</p>
                                </div>
                              </div>
                              {entry.note && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  &ldquo;{entry.note}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Goal Creation Event */}
              {goalInfo && (
                <div className="pt-2">
                  <div className="sticky top-0 bg-background pb-2 pt-1 z-10">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {new Date(goalInfo.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </h3>
                  </div>
                  <div className="relative">
                    <div className="relative flex gap-4 pl-0">
                      <div className="relative z-10 flex-shrink-0 size-8 rounded-full flex items-center justify-center bg-blue-500 text-white">
                        <Flag size={14} weight="fill" />
                      </div>
                      <div className="flex-1 min-w-0 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm">Goal Created</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              by {goalInfo.created_by.name}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold text-sm text-blue-600 dark:text-blue-500 flex items-center gap-1">
                              <Target size={12} />
                              {formatCurrency(goalInfo.target_amount, goalInfo.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(goalInfo.created_at).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="pt-4 border-t">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Contributions</span>
                    <span className="font-semibold">
                      {history.length} contribution{history.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">Total Amount</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-500">
                      {formatCurrency(
                        history.reduce((sum, h) => sum + Number(h.amount), 0),
                        history[0]?.currency || "BHD"
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
