import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function JobCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-2">
            {/* Title */}
            <div className="h-5 bg-muted rounded w-3/4"></div>
            {/* Company & Location */}
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
          {/* Buttons */}
          <div className="flex gap-2">
            <div className="h-9 w-9 bg-muted rounded"></div>
            <div className="h-9 w-9 bg-muted rounded"></div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            <div className="h-6 w-16 bg-muted rounded-full"></div>
            <div className="h-6 w-20 bg-muted rounded-full"></div>
            <div className="h-6 w-24 bg-muted rounded-full"></div>
          </div>
          {/* Salary */}
          <div className="h-4 bg-muted rounded w-1/3"></div>
          {/* Link */}
          <div className="h-4 bg-muted rounded w-1/4"></div>
        </div>
      </CardContent>
    </Card>
  );
}

export function JobListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}
