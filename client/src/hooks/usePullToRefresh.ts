import { useEffect, useRef, useState } from "react";
import { useHaptic } from "./useHaptic";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  enabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const { triggerHaptic } = useHaptic();

  useEffect(() => {
    if (!enabled) return;

    let touchStartY = 0;
    let scrollTop = 0;

    const handleTouchStart = (e: TouchEvent) => {
      scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop === 0) {
        touchStartY = e.touches[0].clientY;
        startY.current = touchStartY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing) return;
      
      const touchY = e.touches[0].clientY;
      const pullDist = touchY - startY.current;

      if (pullDist > 0 && scrollTop === 0) {
        setIsPulling(true);
        setPullDistance(Math.min(pullDist, threshold * 1.5));
        
        // Trigger haptic feedback when threshold is reached
        if (pullDist >= threshold && pullDistance < threshold) {
          triggerHaptic("medium");
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        triggerHaptic("heavy");
        try {
          await onRefresh();
        } finally {
          setTimeout(() => {
            setIsRefreshing(false);
            setIsPulling(false);
            setPullDistance(0);
          }, 500);
        }
      } else {
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, isRefreshing, onRefresh, pullDistance, threshold, triggerHaptic]);

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    progress: Math.min((pullDistance / threshold) * 100, 100),
  };
}
