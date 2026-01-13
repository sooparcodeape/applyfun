import { Loader2, RefreshCw } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { ReactNode } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  enabled?: boolean;
}

export function PullToRefresh({ onRefresh, children, enabled = true }: PullToRefreshProps) {
  const { isPulling, pullDistance, isRefreshing, progress } = usePullToRefresh({
    onRefresh,
    enabled,
  });

  return (
    <div className="relative">
      {/* Pull indicator */}
      {(isPulling || isRefreshing) && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-200"
          style={{
            height: `${Math.min(pullDistance, 80)}px`,
            opacity: progress / 100,
          }}
        >
          <div className="bg-background/95 backdrop-blur-sm rounded-full p-3 shadow-lg border border-border">
            {isRefreshing ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : (
              <RefreshCw
                className="w-5 h-5 text-primary transition-transform"
                style={{
                  transform: `rotate(${progress * 3.6}deg)`,
                }}
              />
            )}
          </div>
        </div>
      )}
      
      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: isPulling && !isRefreshing ? `translateY(${Math.min(pullDistance * 0.5, 40)}px)` : "translateY(0)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
