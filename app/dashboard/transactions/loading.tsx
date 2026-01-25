import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionsLoading() {
  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden pb-16 md:pb-0">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 border-b">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="size-8 rounded-full" />
      </div>

      {/* Search and filters skeleton */}
      <div className="p-4 md:p-6 max-w-4xl mx-auto w-full space-y-4">
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-10 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        {/* Pro banner skeleton */}
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-auto px-4 md:px-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Date group skeleton */}
          {[1, 2].map((group) => (
            <div key={group} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <div className="rounded-xl border">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border-b last:border-b-0">
                    <Skeleton className="size-10 rounded-xl" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
