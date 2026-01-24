import { Skeleton } from "@/components/ui/skeleton";

export default function SpendingLoading() {
  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden pb-16 md:pb-0">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 border-b">
        <Skeleton className="h-6 w-24" />
      </div>

      {/* Tabs skeleton */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded hidden sm:block" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Hero card skeleton */}
            <div className="rounded-xl border overflow-hidden">
              <div className="bg-muted/30 p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-9 w-36" />
                    <Skeleton className="h-6 w-28 rounded-full" />
                  </div>
                  <Skeleton className="size-28 rounded-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x border-t">
                <div className="p-4 space-y-2">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <div className="p-4 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </div>

            {/* Categories skeleton */}
            <div className="rounded-xl border p-4 space-y-3">
              <Skeleton className="h-5 w-40" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="size-10 rounded-xl" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border p-4 space-y-3">
              <Skeleton className="h-5 w-28" />
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="size-10 rounded-xl" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
