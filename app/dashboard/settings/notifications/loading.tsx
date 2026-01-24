import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function NotificationsLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="p-4 border-b sticky top-0 bg-background z-10">
        <Skeleton className="h-8 w-32" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto pb-24">
          {/* Header Card skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="size-5 rounded" />
                <Skeleton className="h-5 w-40" />
              </div>
              <Skeleton className="h-4 w-80 mt-2" />
            </CardHeader>
          </Card>

          {/* Delivery Methods skeleton */}
          <Card>
            <CardHeader className="pb-0">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-56 mt-1" />
            </CardHeader>
            <CardContent className="pt-2">
              {[1, 2].map((item, idx) => (
                <div key={item}>
                  {idx > 0 && <Separator />}
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-5 rounded" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-52" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-9 rounded-full" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Financial Alerts skeleton */}
          <Card>
            <CardHeader className="pb-0">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-64 mt-1" />
            </CardHeader>
            <CardContent className="pt-2">
              {[1, 2, 3, 4].map((item, idx) => (
                <div key={item}>
                  {idx > 0 && <Separator />}
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-5 rounded" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-56" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-9 rounded-full" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Insights skeleton */}
          <Card>
            <CardHeader className="pb-0">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-52 mt-1" />
            </CardHeader>
            <CardContent className="pt-2">
              {[1, 2, 3, 4].map((item, idx) => (
                <div key={item}>
                  {idx > 0 && <Separator />}
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-5 rounded" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-60" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-9 rounded-full" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Info Card skeleton */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="size-5 rounded shrink-0" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-56" />
                  <Skeleton className="h-3 w-64" />
                  <Skeleton className="h-3 w-72" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
