"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/**
 * Card skeleton with optional title
 */
export function CardSkeleton({
  showHeader = true,
  titleWidth = "w-24",
  children,
  className,
}: {
  showHeader?: boolean;
  titleWidth?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-0">
          <Skeleton className={cn("h-5", titleWidth)} />
        </CardHeader>
      )}
      <CardContent className={cn(showHeader ? "pt-4" : "p-6")}>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * List item skeleton for repeated items
 */
export function ListItemSkeleton({
  showIcon = true,
  showAction = true,
  showDescription = true,
  titleWidth = "w-24",
  descriptionWidth = "w-40",
}: {
  showIcon?: boolean;
  showAction?: boolean;
  showDescription?: boolean;
  titleWidth?: string;
  descriptionWidth?: string;
}) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        {showIcon && <Skeleton className="size-5 rounded" />}
        <div>
          <Skeleton className={cn("h-4 mb-1", titleWidth)} />
          {showDescription && <Skeleton className={cn("h-3", descriptionWidth)} />}
        </div>
      </div>
      {showAction && <Skeleton className="size-4" />}
    </div>
  );
}

/**
 * Multiple list items skeleton
 */
export function ListSkeleton({
  count = 3,
  showDividers = true,
  itemProps,
}: {
  count?: number;
  showDividers?: boolean;
  itemProps?: Omit<Parameters<typeof ListItemSkeleton>[0], never>;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          {showDividers && index > 0 && <Separator />}
          <ListItemSkeleton {...itemProps} />
        </div>
      ))}
    </>
  );
}

/**
 * Progress bar skeleton
 */
export function ProgressSkeleton({
  showLabel = true,
  showValue = true,
}: {
  showLabel?: boolean;
  showValue?: boolean;
}) {
  return (
    <div className="space-y-2">
      {(showLabel || showValue) && (
        <div className="flex items-center justify-between">
          {showLabel && <Skeleton className="h-4 w-20" />}
          {showValue && <Skeleton className="h-4 w-12" />}
        </div>
      )}
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

/**
 * Section header skeleton
 */
export function SectionHeaderSkeleton({
  showIcon = false,
  titleWidth = "w-32",
  showDescription = false,
  descriptionWidth = "w-48",
}: {
  showIcon?: boolean;
  titleWidth?: string;
  showDescription?: boolean;
  descriptionWidth?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {showIcon && <Skeleton className="size-5 rounded" />}
        <Skeleton className={cn("h-6", titleWidth)} />
      </div>
      {showDescription && <Skeleton className={cn("h-4", descriptionWidth)} />}
    </div>
  );
}

/**
 * Stat card skeleton (for balance, usage displays)
 */
export function StatCardSkeleton({
  showIcon = true,
  showLabel = true,
  showChange = false,
}: {
  showIcon?: boolean;
  showLabel?: boolean;
  showChange?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            {showLabel && <Skeleton className="h-4 w-20" />}
            <Skeleton className="h-8 w-32" />
            {showChange && <Skeleton className="h-4 w-24" />}
          </div>
          {showIcon && <Skeleton className="size-10 rounded-full" />}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Pricing/Plan card skeleton
 */
export function PlanCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Button */}
        <Skeleton className="h-10 w-full rounded-md" />

        {/* Features */}
        <div className="space-y-3 pt-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2">
              <Skeleton className="size-4 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Avatar skeleton
 */
export function AvatarSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "size-8",
    md: "size-10",
    lg: "size-12",
  };

  return <Skeleton className={cn("rounded-full", sizeClasses[size])} />;
}

/**
 * Button skeleton
 */
export function ButtonSkeleton({
  width = "w-24",
  size = "md",
}: {
  width?: string;
  size?: "sm" | "md" | "lg";
}) {
  const heightClasses = {
    sm: "h-8",
    md: "h-10",
    lg: "h-11",
  };

  return <Skeleton className={cn("rounded-md", heightClasses[size], width)} />;
}

/**
 * Text line skeleton
 */
export function TextSkeleton({
  width = "w-full",
  height = "h-4",
  className,
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return <Skeleton className={cn(height, width, className)} />;
}

/**
 * Paragraph skeleton (multiple lines)
 */
export function ParagraphSkeleton({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-4",
            index === lines - 1 ? "w-3/4" : "w-full" // Last line shorter
          )}
        />
      ))}
    </div>
  );
}

/**
 * Table skeleton
 */
export function TableSkeleton({
  columns = 4,
  rows = 5,
  showHeader = true,
}: {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="space-y-2">
      {showHeader && (
        <div className="flex gap-4 p-4 border-b">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-4 flex-1" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
