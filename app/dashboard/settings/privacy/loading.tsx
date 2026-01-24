import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function PrivacyLoading() {
  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden">
      {/* Header skeleton */}
      <div className="p-4 border-b sticky top-0 bg-background z-10">
        <Skeleton className="h-8 w-32" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto pb-24">
          {/* Info Banner skeleton */}
          <Card className="bg-muted/30">
            <CardContent className="p-4 flex items-start gap-3">
              <Skeleton className="size-5 rounded shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full max-w-md" />
              </div>
            </CardContent>
          </Card>

          {/* Consents Card skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="size-5 rounded" />
                <Skeleton className="h-5 w-28" />
              </div>
              <Skeleton className="h-4 w-56 mt-1" />
            </CardHeader>
            <CardContent className="p-0">
              {[1, 2].map((i) => (
                <div key={i}>
                  {i > 1 && <Separator />}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-8 rounded" />
                      <Skeleton className="size-8 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Export Card skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="size-5 rounded" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-4 w-48 mt-1" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-9 w-20 rounded" />
              </div>
            </CardContent>
          </Card>

          {/* Delete Card skeleton */}
          <Card className="border-destructive/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="size-5 rounded" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-4 w-48 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full max-w-md mb-4" />
              <Skeleton className="h-9 w-44 rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
