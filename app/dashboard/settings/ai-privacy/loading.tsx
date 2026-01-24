import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AIPrivacyLoading() {
  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden">
      {/* Header skeleton */}
      <div className="p-4 border-b">
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
          {/* Main Settings Card Skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="size-5 rounded" />
                <Skeleton className="h-6 w-40" />
              </div>
              <Skeleton className="h-4 w-72 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode Options Skeleton */}
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 rounded-lg border-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="size-5 rounded" />
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full max-w-md mb-3" />
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-36" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Toggle Section Skeleton */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64 mt-2" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>

              {/* Info Box Skeleton */}
              <div className="rounded-lg p-4 border bg-muted/30">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-5 rounded shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-full max-w-sm" />
                    <Skeleton className="h-3 w-full max-w-md" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Card Skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="size-5 rounded" />
                <Skeleton className="h-6 w-40" />
              </div>
              <Skeleton className="h-4 w-72 mt-1" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-lg border p-4 space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
