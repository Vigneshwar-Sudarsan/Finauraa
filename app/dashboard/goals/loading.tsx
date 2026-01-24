import { Skeleton } from "@/components/ui/skeleton";

export default function GoalsLoading() {
  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden pb-16 md:pb-0">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 border-b">
        <Skeleton className="h-6 w-28" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Overview card skeleton */}
          <div className="rounded-xl border overflow-hidden">
            <div className="bg-muted/30 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="h-3 w-12 ml-auto" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>

          {/* Filter chips skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
            <Skeleton className="h-9 w-24 rounded hidden sm:block" />
          </div>

          {/* Goal cards skeleton */}
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-3 w-16 ml-auto" />
                </div>
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
